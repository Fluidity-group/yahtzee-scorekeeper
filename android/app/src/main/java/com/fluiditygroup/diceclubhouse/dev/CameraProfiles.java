package com.fluiditygroup.diceclubhouse.dev;

import android.app.AlertDialog;
import android.content.Context;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.text.InputType;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import java.util.UUID;
import java.util.concurrent.Executor;

/** Native sheet keeps entered secrets out of JavaScript. Profile metadata contains no credentials. */
final class CameraProfiles {
 private final android.content.SharedPreferences profiles;
 private final CameraCredentials credentials;
 CameraProfiles(Context context,CameraCredentials credentials){this.credentials=credentials;profiles=context.getSharedPreferences("c121-profiles",Context.MODE_PRIVATE);}
 JSObject get(String id){try{return new JSObject(profiles.getString(id,"{}"));}catch(Exception ignored){return new JSObject();}}
 JSArray list(){JSArray result=new JSArray();for(String id:profiles.getAll().keySet())result.put(get(id));return result;}
 void remove(String id){profiles.edit().remove(id).apply();}
 void configure(android.app.Activity activity,PluginCall call,Executor executor){
  LinearLayout layout=new LinearLayout(activity);layout.setOrientation(LinearLayout.VERTICAL);layout.setPadding(32,16,32,16);
  EditText host=new EditText(activity);host.setHint("Camera IP / hostname");host.setSingleLine(true);
  EditText user=new EditText(activity);user.setHint("Local camera username");user.setSingleLine(true);
  EditText password=new EditText(activity);password.setHint("Local camera password");password.setSingleLine(true);password.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);
  EditText stream=new EditText(activity);stream.setHint("stream1 or stream2");stream.setText("stream1");stream.setSingleLine(true);
  for(EditText input:new EditText[]{host,user,password,stream})layout.addView(input);
  String existing=call.getString("profileId");String id=existing!=null&&existing.matches("[A-Za-z0-9_-]{1,64}")?existing:UUID.randomUUID().toString();
  JSObject saved=get(id);host.setText(saved.optString("host",""));stream.setText(saved.optString("stream","stream1"));
  CameraProfileSave save=new CameraProfileSave();
  AlertDialog dialog=new AlertDialog.Builder(activity).setTitle("Connect local C121 camera").setView(layout)
   .setNegativeButton("Cancel",null).setPositiveButton("Save",null).create();
  dialog.setOnCancelListener(d->{if(save.cancel())call.reject("Camera setup cancelled","CANCELLED");});
  java.util.function.Consumer<Boolean> busy=value->{
   dialog.setCancelable(!value);dialog.setCanceledOnTouchOutside(!value);
   dialog.getButton(AlertDialog.BUTTON_POSITIVE).setEnabled(!value);
   dialog.getButton(AlertDialog.BUTTON_NEGATIVE).setEnabled(!value);
   for(EditText input:new EditText[]{host,user,password,stream})input.setEnabled(!value);
  };
  Runnable failure=()->{busy.accept(false);host.setError("Secure storage unavailable");};
  dialog.setOnShowListener(d->{
   dialog.getButton(AlertDialog.BUTTON_NEGATIVE).setOnClickListener(v->{if(save.cancel()){password.setText("");user.setText("");dialog.dismiss();call.reject("Camera setup cancelled","CANCELLED");}});
   dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
   String h=host.getText().toString().trim(),s=stream.getText().toString().trim(),u=user.getText().toString(),p=password.getText().toString();
   if(!h.matches("[A-Za-z0-9.-]{1,253}")||(!s.equals("stream1")&&!s.equals("stream2"))||u.isEmpty()||p.isEmpty()||u.length()>256||p.length()>256){host.setError("Enter host, local credentials and stream1/stream2");return;}
   save.submit(executor,()->{try{credentials.put(id,u,p);JSObject profile=new JSObject();profile.put("profileId",id);profile.put("cameraId",id);profile.put("host",h);profile.put("stream",s);if(!profiles.edit().putString(id,profile.toString()).commit())throw new Exception("storage");activity.runOnUiThread(()->{if(save.complete()){password.setText("");user.setText("");dialog.dismiss();call.resolve(profile);}});}catch(Exception ignored){activity.runOnUiThread(()->{if(save.failed())failure.run();});}},()->busy.accept(true),failure);
  });});dialog.show();dialog.getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE);
 }
}

