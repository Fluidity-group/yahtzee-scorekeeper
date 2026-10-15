package com.fluiditygroup.diceclubhouse.dev;

import android.net.Uri;
import androidx.media3.common.C;
import androidx.media3.datasource.BaseDataSource;
import androidx.media3.datasource.DataSpec;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/** Incremental MP3 transport. Never follows redirects or stores the full audio clip. */
final class CommentaryStreamDataSource extends BaseDataSource {
    private final String endpoint, token, claim, device;
    private final int epoch;
    static final class NoReactionException extends IOException {}
    interface Binding { void accept(String encoded,long responseElapsedMs) throws IOException; }
    private final Runnable firstByte;
    private final String eventId,sourceCommandId,jobSelector;
    private final int profileVersion;
    private final Binding binding;
    private volatile HttpURLConnection connection;
    private InputStream input;
    private DataSpec spec;
    private boolean started, reported;
    private long bytes;
    CommentaryStreamDataSource(String endpoint, String token, String claim, int epoch, String device, Runnable firstByte) {
        this(endpoint,token,claim,epoch,device,firstByte,null,null,null,0,null);
    }
    CommentaryStreamDataSource(String endpoint,String token,String claim,int epoch,String device,Runnable firstByte,String eventId,String sourceCommandId,String jobSelector,int profileVersion,Binding binding){
        super(true);this.endpoint=endpoint;this.token=token;this.claim=claim;this.epoch=epoch;this.device=device;this.firstByte=firstByte;this.eventId=eventId;this.sourceCommandId=sourceCommandId;this.jobSelector=jobSelector;this.profileVersion=profileVersion;this.binding=binding;
    }
    @Override public long open(DataSpec spec) throws IOException {
        if(spec.position!=0)throw new IOException("Streaming audio is not seekable");
        this.spec=spec; transferInitializing(spec);
        HttpURLConnection request=(HttpURLConnection)new URL(endpoint).openConnection(); connection=request;
        request.setInstanceFollowRedirects(false);request.setConnectTimeout(5000);request.setReadTimeout(binding==null?12000:25000);
        request.setRequestMethod("GET");
        request.setRequestProperty("Authorization","Bearer "+token);
        if(binding!=null){request.setRequestProperty("X-Commentary-Event",eventId);request.setRequestProperty("X-Commentary-Command",sourceCommandId);request.setRequestProperty("X-Commentary-Job",jobSelector);request.setRequestProperty("X-Commentary-Profile",String.valueOf(profileVersion));}
        else request.setRequestProperty("X-Commentary-Claim",claim);request.setRequestProperty("X-Commentary-Epoch",String.valueOf(epoch));request.setRequestProperty("X-Commentary-Device",device);request.setRequestProperty("Accept","audio/mpeg");
        int status=request.getResponseCode();long headersAt=android.os.SystemClock.elapsedRealtime();
        android.util.Log.i("LiveCommentary", "stream-http-status="+status);
        if(status==204&&binding!=null)throw new NoReactionException();
        if(status!=200)throw new IOException("Stream authorization or availability rejected");
        String content=request.getContentType();
        if(content==null||!content.toLowerCase(java.util.Locale.ROOT).startsWith("audio/mpeg"))throw new IOException("Expected streaming MP3");
        if(binding!=null)binding.accept(request.getHeaderField("X-Commentary-Binding"),headersAt);
        input=request.getInputStream();started=true;transferStarted(spec);return C.LENGTH_UNSET;
    }
    @Override public int read(byte[] buffer,int offset,int length)throws IOException {
        if(length==0)return 0;
        int count=input.read(buffer,offset,length);
        if(count<0)return C.RESULT_END_OF_INPUT;
        bytes+=count;if(bytes>2*1024*1024)throw new IOException("Commentary byte limit exceeded");
        if(count>0){bytesTransferred(count);if(!reported){reported=true;firstByte.run();}}
        return count;
    }
    @Override public Uri getUri(){return spec==null?null:spec.uri;}
    @Override public Map<String,List<String>> getResponseHeaders(){return Collections.emptyMap();}
    @Override public void close()throws IOException {
        HttpURLConnection prior=connection;connection=null;if(prior!=null)prior.disconnect();
        try{if(input!=null)input.close();}finally{input=null;if(started){started=false;transferEnded();}}
    }
}

