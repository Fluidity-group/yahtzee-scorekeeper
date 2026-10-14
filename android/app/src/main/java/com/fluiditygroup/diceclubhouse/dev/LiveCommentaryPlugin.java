package com.fluiditygroup.diceclubhouse.dev;

import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.analytics.AnalyticsListener;
import androidx.media3.exoplayer.source.ProgressiveMediaSource;
import androidx.media3.exoplayer.upstream.DefaultLoadErrorHandlingPolicy;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Foreground-only commentary. Server owns authentication and fenced speaker authority. */
@CapacitorPlugin(name="LiveCommentary")
public final class LiveCommentaryPlugin extends Plugin {
    private final Handler main=new Handler(Looper.getMainLooper());
    private ExoPlayer player;
    private String jobId;
    private int epoch,sequence,generation;
    private long beganAt;
    private boolean paused,firstPlayout;
    private Runnable leaseExpiry,clipExpiry;
    private void ui(Runnable task){main.post(task);}
    private void emit(String state,String reason){
        if(jobId==null)return;
        android.util.Log.i("LiveCommentary", "state="+state+" reason="+reason);
        JSObject value=new JSObject();value.put("jobId",jobId);value.put("epoch",epoch);value.put("sequence",++sequence);
        value.put("state",state);value.put("reason",reason);value.put("nativeElapsedMs",SystemClock.elapsedRealtime()-beganAt);
        value.put("measurementBasis",state.equals("playout-started")?"native-audio-position-proxy":"native-monotonic");
        notifyListeners("playback",value);
    }
    private void end(String state,String reason){
        if(jobId!=null)emit(state,reason);generation++;
        if(leaseExpiry!=null)main.removeCallbacks(leaseExpiry);if(clipExpiry!=null)main.removeCallbacks(clipExpiry);
        ExoPlayer prior=player;player=null;jobId=null;if(prior!=null)prior.release();
    }
    private void renewDeadline(int remaining){
        if(leaseExpiry!=null)main.removeCallbacks(leaseExpiry);
        leaseExpiry=()->end("interrupted","lease-expired");main.postDelayed(leaseExpiry,remaining);
    }
    @PluginMethod public void play(PluginCall call){
        final String endpoint=call.getString("endpoint"),token=call.getString("accessToken"),claim=call.getString("claimToken"),device=call.getString("deviceId"),id=call.getString("jobId");
        final int requestedEpoch=call.getInt("epoch",0),remaining=call.getInt("leaseRemainingMs",0);
        Uri uri=endpoint==null?null:Uri.parse(endpoint);
        if(endpoint==null||endpoint.length()>2048||uri==null||!"https".equals(uri.getScheme())||uri.getHost()==null||uri.getUserInfo()!=null||uri.getQuery()!=null||uri.getFragment()!=null||
            token==null||token.isEmpty()||token.length()>8192||token.contains("\r")||token.contains("\n")||claim==null||claim.isEmpty()||claim.length()>512||claim.contains("\r")||claim.contains("\n")||device==null||device.isEmpty()||device.length()>200||device.contains("\r")||device.contains("\n")||
            id==null||id.isEmpty()||id.length()>200||requestedEpoch<1||remaining<1||remaining>15000){call.reject("Invalid bounded authenticated stream request");return;}
        ui(()->{
            if(paused){call.reject("Foreground playback required");return;}
            end("interrupted","superseded");jobId=id;epoch=requestedEpoch;sequence=0;beganAt=SystemClock.elapsedRealtime();firstPlayout=false;
            final int ownGeneration=generation;
            try{
                DefaultLoadControl load=new DefaultLoadControl.Builder().setBufferDurationsMs(500,3000,200,500).setTargetBufferBytes(256*1024).build();
                player=new ExoPlayer.Builder(getContext()).setLoadControl(load).build();
                player.setAudioAttributes(new AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_SPEECH).build(),true);
                player.setHandleAudioBecomingNoisy(true);
                player.addAnalyticsListener(new AnalyticsListener(){
                    @Override public void onAudioPositionAdvancing(EventTime time,long playoutStartSystemTimeMs){
                        if(generation==ownGeneration&&!firstPlayout){firstPlayout=true;emit("playout-started","approximate-audio-position");}
                    }
                });
                player.addListener(new Player.Listener(){
                    @Override public void onPlaybackStateChanged(int state){if(generation==ownGeneration&&state==Player.STATE_ENDED)end("completed","stream-ended");}
                    @Override public void onPlaybackSuppressionReasonChanged(int reason){if(generation==ownGeneration&&reason!=Player.PLAYBACK_SUPPRESSION_REASON_NONE)end("interrupted","audio-focus-suppressed");}
                    @Override public void onPlayerError(PlaybackException error){if(generation==ownGeneration)end("failed",error.getErrorCodeName());}
                    @Override public void onPlayWhenReadyChanged(boolean ready,int reason){
                        if(generation==ownGeneration&&!ready&&(reason==Player.PLAY_WHEN_READY_CHANGE_REASON_AUDIO_FOCUS_LOSS||reason==Player.PLAY_WHEN_READY_CHANGE_REASON_AUDIO_BECOMING_NOISY))end("interrupted","audio-focus-or-route");
                    }
                });
                ProgressiveMediaSource source=new ProgressiveMediaSource.Factory(()->new CommentaryStreamDataSource(endpoint,token,claim,requestedEpoch,device,()->ui(()->{if(generation==ownGeneration)emit("first-byte","native-http");})))
                    .setLoadErrorHandlingPolicy(new DefaultLoadErrorHandlingPolicy(0)).createMediaSource(MediaItem.fromUri(endpoint));
                player.setMediaSource(source);renewDeadline(remaining);clipExpiry=()->end("interrupted","clip-time-limit");main.postDelayed(clipExpiry,30000);
                emit("opening","authenticated-stream");player.prepare();player.play();call.resolve();
            }catch(Exception error){end("failed","native-setup-failed");call.reject("Native commentary setup failed");}
        });
    }
    @PluginMethod public void renew(PluginCall call){ui(()->{
        int remaining=call.getInt("leaseRemainingMs",0);
        if(jobId==null||!jobId.equals(call.getString("jobId"))||epoch!=call.getInt("epoch",0)||remaining<1||remaining>15000){call.reject("Lease renewal does not match current playback");return;}
        renewDeadline(remaining);call.resolve();
    });}
    @PluginMethod public void stop(PluginCall call){ui(()->{end("interrupted","client-cancelled");call.resolve();});}
    @Override protected void handleOnPause(){paused=true;ui(()->end("interrupted","background"));}
    @Override protected void handleOnResume(){paused=false;}
    @Override protected void handleOnDestroy(){ui(()->end("interrupted","destroyed"));}
}
