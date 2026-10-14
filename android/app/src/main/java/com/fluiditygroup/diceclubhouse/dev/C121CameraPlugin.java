package com.fluiditygroup.diceclubhouse.dev;

import android.graphics.Bitmap;
import android.graphics.SurfaceTexture;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.TextureView;
import android.view.Surface;
import android.view.ViewGroup;
import androidx.coordinatorlayout.widget.CoordinatorLayout;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.VideoSize;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.rtsp.RtspMediaSource;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Local RTSP POC. Pull snapshots are rendered pixels, never asserted sensor timestamps. */
@CapacitorPlugin(name = "C121Camera")
public class C121CameraPlugin extends Plugin {
    static final class GeometryUpdate {
        final int width, height;
        final boolean changed;
        final long renderedAt;
        GeometryUpdate(int previousWidth, int previousHeight, long previousRenderAt, int width, int height, int rotation, float pixelRatio) {
            if(width<1||height<1||width>4096||height>4096||rotation!=0||pixelRatio!=1f)throw new IllegalArgumentException("Unsupported geometry");
            this.width=width;this.height=height;
            changed=width!=previousWidth||height!=previousHeight;
            // A render from the previous geometry is not a frame at the new dimensions.
            renderedAt=changed?0:previousRenderAt;
        }
    }
    static boolean snapshotStillValid(long expectedGeometry, long currentGeometry, long expectedGeneration, long currentGeneration, long frameAt, long now, int maxAge) {
        return expectedGeometry==currentGeometry&&CameraFrameValidity.accepts(expectedGeneration,currentGeneration,frameAt,now,maxAge);
    }
    /** Per-lease scalar timings only: no retained history, pixels, URLs or credentials. */
    static final class FrameTiming {
        static final double MAX_MS = 60000d;
        final double snapshotExtractionMs, pngEncodeAndWriteMs, nativeRenderAgeMs;
        final boolean capped;
        FrameTiming(long extractionStartNs, long extractionEndNs, long writeStartNs, long writeEndNs, long renderAtMs, long deliveredAtMs) {
            double extraction = durationMs(extractionStartNs, extractionEndNs, 1000000d);
            double write = durationMs(writeStartNs, writeEndNs, 1000000d);
            double age = durationMs(renderAtMs, deliveredAtMs, 1d);
            capped = extraction > MAX_MS || write > MAX_MS || age > MAX_MS;
            snapshotExtractionMs = Math.min(MAX_MS, extraction);
            pngEncodeAndWriteMs = Math.min(MAX_MS, write);
            nativeRenderAgeMs = Math.min(MAX_MS, age);
        }
        private static double durationMs(long start, long end, double unitsPerMs) {
            // Timing faults must not produce negative or unbounded diagnostic numbers.
            return start < 0 || end < start ? 0d : ((double)end - (double)start) / unitsPerMs;
        }
        JSObject toJson() {
            JSObject value = new JSObject();
            value.put("clock", "android-elapsed-realtime");
            value.put("meaning", "local-stage-durations-not-sensor-latency");
            value.put("snapshotExtractionMs", snapshotExtractionMs);
            value.put("pngEncodeAndWriteMs", pngEncodeAndWriteMs);
            value.put("nativeRenderAgeMs", nativeRenderAgeMs);
            value.put("maxDurationMs", MAX_MS); value.put("capped", capped);
            return value;
        }
    }
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService files = Executors.newSingleThreadExecutor();
    private ExoPlayer player;
    private TextureView texture;
    private Surface videoSurface;
    private CameraCredentials credentials;
    private CameraProfiles profiles;
    private android.net.ConnectivityManager connectivity;
    private android.net.Network cameraNetwork;
    private final android.net.ConnectivityManager.NetworkCallback networkCallback = new android.net.ConnectivityManager.NetworkCallback() { @Override public void onLost(android.net.Network network) {ui(() -> {if(network.equals(cameraNetwork)&&player!=null)stop("interrupted");});} };
    private String state = "disconnected", cameraId = "", sessionId = "", frameToken;
    private File frameFile;
    private long generation, sequence, renderedAt, connectedAt, geometryRevision;
    private int width, height;
    private boolean acquiring, paused, previewVisible=true;
    private int previewLeft,previewTop,previewWidth=1,previewHeight=1;
    private final Runnable watchdog = new Runnable() { public void run() {
        if (player == null) return;
        long now = SystemClock.elapsedRealtime();
        if ((renderedAt > 0 && now-renderedAt > 3000) || (renderedAt == 0 && now-connectedAt > 10000)) {
            stop("interrupted"); return;
        }
        main.postDelayed(this, 1000);
    }};
    @Override public void load() { androidx.media3.common.util.Log.setLogLevel(androidx.media3.common.util.Log.LOG_LEVEL_OFF); credentials = new CameraCredentials(getContext()); profiles = new CameraProfiles(getContext(),credentials);
        connectivity=(android.net.ConnectivityManager)getContext().getSystemService(android.content.Context.CONNECTIVITY_SERVICE);
        connectivity.registerNetworkCallback(new android.net.NetworkRequest.Builder().addTransportType(android.net.NetworkCapabilities.TRANSPORT_WIFI).build(),networkCallback);
        files.execute(() -> {File directory=new File(getContext().getCacheDir(),"c121-frames");File[] abandoned=directory.listFiles();if(abandoned!=null)for(File file:abandoned)if(file.getName().matches("[a-f0-9-]{36}\\.png"))file.delete();}); }
    private void ui(Runnable runnable) { main.post(runnable); }
    private boolean profile(String id) { return id != null && id.matches("[A-Za-z0-9_-]{1,64}"); }
    private JSObject status() {
        JSObject value = new JSObject(); value.put("state",state); value.put("cameraId",cameraId); value.put("sessionId",sessionId);
        value.put("generation",generation); value.put("sequence",sequence); value.put("nowMonotonicMs",SystemClock.elapsedRealtime());
        value.put("renderedAtMonotonicMs",renderedAt); value.put("streamWidth",width); value.put("streamHeight",height);
        value.put("timestampMeaning","local-render-not-sensor-capture"); value.put("source","c121-rtsp"); return value;
    }
    private void publish(String next) { state = next; notifyListeners("status",status()); }
    private void deleteFrame() { if(frameFile != null) frameFile.delete(); frameFile=null; frameToken=null; }
    private void stop(String next) {
        generation++; sessionId=""; renderedAt=0; sequence=0; width=height=0; main.removeCallbacks(watchdog);
        if(player != null) { player.release(); player=null; }
        if(videoSurface != null) { videoSurface.release(); videoSurface=null; }
        if(texture != null) { ViewGroup parent=(ViewGroup)texture.getParent(); if(parent!=null)parent.removeView(texture); texture=null; }
        deleteFrame(); publish(next);
    }
    @PluginMethod public void configureProfile(PluginCall call) { ui(() -> {stop("disconnected");profiles.configure(getActivity(),call,files);}); }
    @PluginMethod public void listProfiles(PluginCall call) { JSObject result=new JSObject();result.put("profiles",profiles.list());call.resolve(result); }
    @PluginMethod public void getStatus(PluginCall call) { ui(() -> call.resolve(status())); }
    @PluginMethod public void updateCredentials(PluginCall call) {
        String id=call.getString("cameraId"), username=call.getString("username"), password=call.getString("password");
        if(!profile(id)||username==null||password==null||username.isEmpty()||password.isEmpty()||username.length()>256||password.length()>256) { call.reject("Invalid camera credentials","INVALID_CONFIGURATION"); return; }
        ui(() -> { if(id.equals(cameraId))stop("disconnected"); files.execute(() -> { try {credentials.put(id,username,password);call.resolve();}catch(Exception ignored){call.reject("Secure credential storage unavailable","CREDENTIAL_STORAGE");} }); });
    }
    @PluginMethod public void removeCredentials(PluginCall call) {
        String id=call.getString("cameraId"); if(!profile(id)){call.reject("Invalid camera identifier","INVALID_CONFIGURATION");return;}
        ui(() -> { if(id.equals(cameraId))stop("disconnected"); files.execute(() -> {try{credentials.remove(id);profiles.remove(id);call.resolve();}catch(Exception ignored){call.reject("Credential removal failed","CREDENTIAL_STORAGE");}}); });
    }
    @PluginMethod public void connect(PluginCall call) {
        String profileId=call.getString("profileId"); JSObject saved=profiles.get(profileId==null?"":profileId);
        String id=call.getString("cameraId",profileId), host=call.getString("host",saved.optString("host",null)), stream=call.getString("stream",saved.optString("stream","stream1"));
        if(!profile(id)||host==null||!host.matches("[A-Za-z0-9.-]{1,253}")||(!stream.equals("stream1")&&!stream.equals("stream2"))) {call.reject("Use a camera host and stream1 or stream2","INVALID_CONFIGURATION");return;}
        ui(() -> {
            if(paused){call.reject("Resume the app before connecting","APP_BACKGROUND");return;}
            stop("disconnected"); cameraId=id; sessionId=UUID.randomUUID().toString(); final long expected=generation; publish("connecting");
            files.execute(() -> {try {String[] secret=credentials.get(id); ui(() -> {
                if(generation!=expected||paused){call.reject("Connection superseded","SESSION_CHANGED");return;}
                try {
                    // Credential URI exists only inside native decoder; never serialize or log it.
                    Uri uri=Uri.parse("rtsp://"+Uri.encode(secret[0])+":"+Uri.encode(secret[1])+"@"+host+":554/"+stream);
                    cameraNetwork=null;for(android.net.Network network:connectivity.getAllNetworks()){android.net.NetworkCapabilities capabilities=connectivity.getNetworkCapabilities(network);if(capabilities!=null&&capabilities.hasTransport(android.net.NetworkCapabilities.TRANSPORT_WIFI)){cameraNetwork=network;break;}}
                    if(cameraNetwork==null){stop("interrupted");call.reject("Connect the phone to camera Wi-Fi first","WIFI_UNAVAILABLE");return;}
                    player=new ExoPlayer.Builder(getContext()).build(); player.setVolume(0);
                    player.addListener(new Player.Listener() {
                        @Override public void onVideoSizeChanged(VideoSize size){
                            if(generation!=expected)return;
                            try {
                                GeometryUpdate update=new GeometryUpdate(width,height,renderedAt,size.width,size.height,size.unappliedRotationDegrees,size.pixelWidthHeightRatio);
                                width=update.width;height=update.height;renderedAt=update.renderedAt;
                                if(update.changed){geometryRevision++;connectedAt=SystemClock.elapsedRealtime();publish(state);}
                            }catch(IllegalArgumentException ignored){stop("unsupported-stream");}
                        }
                        @Override public void onPlayerError(PlaybackException error){if(generation!=expected)return;
                            String type=error.errorCode==PlaybackException.ERROR_CODE_DECODING_FORMAT_UNSUPPORTED||error.errorCode==PlaybackException.ERROR_CODE_DECODING_FAILED?"unsupported-stream":"interrupted";
                            // Inspect status code internally, but never expose exception text or URI.
                            Throwable cause=error; while(cause!=null){String message=cause.getMessage();if(message!=null&&(message.matches(".*\\b401\\b.*")||message.matches(".*\\b403\\b.*")))type="authentication-failure";cause=cause.getCause();}
                            stop(type);
                        }
                    });
                    texture=new TextureView(getContext());
                    texture.setSurfaceTextureListener(new TextureView.SurfaceTextureListener(){
                        @Override public void onSurfaceTextureAvailable(SurfaceTexture surface,int w,int h){if(generation==expected&&player!=null){videoSurface=new Surface(surface);player.setVideoSurface(videoSurface);}}
                        @Override public void onSurfaceTextureSizeChanged(SurfaceTexture surface,int w,int h){}
                        @Override public boolean onSurfaceTextureDestroyed(SurfaceTexture surface){if(generation==expected){if(player!=null)player.clearVideoSurface();if(videoSurface!=null){videoSurface.release();videoSurface=null;}}return true;}
                        @Override public void onSurfaceTextureUpdated(SurfaceTexture surface){if(generation!=expected)return;renderedAt=SystemClock.elapsedRealtime();sequence++;if(!state.equals("live"))publish("live");}
                    });
                    ((ViewGroup)getBridge().getWebView().getParent()).addView(texture,new CoordinatorLayout.LayoutParams(1,1));
                    applyPreview();
                    player.setMediaSource(new RtspMediaSource.Factory().setSocketFactory(cameraNetwork.getSocketFactory()).setForceUseRtpTcp(true).setTimeoutMs(5000).createMediaSource(MediaItem.fromUri(uri)));
                    connectedAt=SystemClock.elapsedRealtime();player.prepare();player.play();main.postDelayed(watchdog,1000);call.resolve(status());
                }catch(Exception ignored){stop("unsupported-stream");call.reject("Native stream setup failed","STREAM_SETUP");}
            });}catch(Exception ignored){ui(()->{if(generation==expected)stop("authentication-failure");call.reject("Save local camera credentials first","CREDENTIAL_STORAGE");});} });
        });
    }
    private void applyPreview() {
        if(texture==null)return;
        texture.setAlpha(previewVisible?1f:0f);
        int[] location=new int[2];getBridge().getWebView().getLocationOnScreen(location);
        int[] parentLocation=new int[2];((android.view.View)texture.getParent()).getLocationOnScreen(parentLocation);
        CoordinatorLayout.LayoutParams layout=new CoordinatorLayout.LayoutParams(previewWidth,previewHeight);
        layout.leftMargin=previewLeft+location[0]-parentLocation[0];layout.topMargin=previewTop+location[1]-parentLocation[1];texture.setLayoutParams(layout);
    }
    @PluginMethod public void setPreviewRect(PluginCall call) { ui(() -> {
        double density=getContext().getResources().getDisplayMetrics().density;
        int left=(int)(call.getDouble("left",call.getDouble("x",0d))*density),top=(int)(call.getDouble("top",call.getDouble("y",0d))*density);
        int w=(int)(call.getDouble("width",1d)*density),h=(int)(call.getDouble("height",1d)*density);
        boolean visible=call.getBoolean("visible",true);
        if(visible&&(w<1||h<1||w>8192||h>8192||left<0||top<0)){call.reject("Invalid preview rectangle","INVALID_CONFIGURATION");return;}
        if(visible){previewLeft=left;previewTop=top;previewWidth=w;previewHeight=h;}
        previewVisible=visible;applyPreview();call.resolve();
    }); }
    @PluginMethod public void disconnect(PluginCall call) { ui(() -> {stop("disconnected");call.resolve(status());}); }
    @PluginMethod public void acquireLatestFrame(PluginCall call) { ui(() -> {
        if(acquiring||frameFile!=null){call.reject("Release the previous frame first","FRAME_BUSY");return;}
        long now=SystemClock.elapsedRealtime();int maxAge=call.getInt("maxAgeMs",1000),maxWidth=call.getInt("maxWidth",1280);
        if(maxAge<1||maxAge>3000||maxWidth<160||maxWidth>2560){call.reject("Invalid frame bounds","INVALID_CONFIGURATION");return;}
        if(!state.equals("live")||texture==null||width<=0||height<=0||!CameraFrameValidity.accepts(generation,generation,renderedAt,now,maxAge)){call.reject("No fresh rendered frame","STALE_FRAME");return;}
        acquiring=true;final long expected=generation,expectedGeometry=geometryRevision,frameSequence=sequence,frameAt=renderedAt;
        final String token=UUID.randomUUID().toString();final int outWidth=Math.min(width,maxWidth),outHeight=Math.max(1,(int)((long)height*outWidth/width));
        final long extractionStartNs=SystemClock.elapsedRealtimeNanos();
        Bitmap bitmap=texture.getBitmap(outWidth,outHeight);
        final long extractionEndNs=SystemClock.elapsedRealtimeNanos();
        if(bitmap==null){acquiring=false;call.reject("Rendered pixels unavailable","NO_PIXELS");return;}
        JSObject metadata=status();metadata.put("frameId",token);metadata.put("sequence",frameSequence);metadata.put("renderedAtMonotonicMs",frameAt);metadata.put("width",outWidth);metadata.put("height",outHeight);metadata.put("orientationDegrees",0);metadata.put("pixelFormat","png-srgb");metadata.put("calibrationId",call.getString("calibrationId",""));
        files.execute(() -> {File file=null;try {
            File directory=new File(getContext().getCacheDir(),"c121-frames"); if(!directory.exists()&&!directory.mkdirs())throw new Exception("directory");
            final long writeStartNs=SystemClock.elapsedRealtimeNanos();
            file=new File(directory,token+".png");try(FileOutputStream output=new FileOutputStream(file)){if(!bitmap.compress(Bitmap.CompressFormat.PNG,100,output))throw new Exception("encode");}
            final long writeEndNs=SystemClock.elapsedRealtimeNanos();
            final File complete=file; ui(() -> {acquiring=false;long deliveredAt=SystemClock.elapsedRealtime();if(!state.equals("live")||!snapshotStillValid(expectedGeometry,geometryRevision,expected,generation,frameAt,deliveredAt,maxAge)){complete.delete();call.reject("Frame invalidated during transfer","STALE_FRAME");return;}frameFile=complete;frameToken=token;metadata.put("fileUri",Uri.fromFile(complete).toString());metadata.put("nowMonotonicMs",deliveredAt);metadata.put("timingDiagnostics",new FrameTiming(extractionStartNs,extractionEndNs,writeStartNs,writeEndNs,frameAt,deliveredAt).toJson());call.resolve(metadata);});
        }catch(Exception ignored){if(file!=null)file.delete();ui(()->{acquiring=false;call.reject("Frame snapshot failed","FRAME_STORAGE");});}finally{bitmap.recycle();} });
    }); }
    @PluginMethod public void releaseFrame(PluginCall call) {ui(()->{if(frameToken!=null&&frameToken.equals(call.getString("frameId")))deleteFrame();call.resolve();});}
    @Override protected void handleOnPause(){paused=true;ui(()->stop("interrupted"));}
    @Override protected void handleOnResume(){paused=false;}
    @Override protected void handleOnDestroy(){ui(()->{stop("disconnected");connectivity.unregisterNetworkCallback(networkCallback);files.shutdown();});}
}







