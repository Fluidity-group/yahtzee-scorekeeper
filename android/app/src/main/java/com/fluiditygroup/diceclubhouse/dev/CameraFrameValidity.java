package com.fluiditygroup.diceclubhouse.dev;

/** Clock/session guard independent of Android; a locally fresh render cannot prove sensor freshness. */
final class CameraFrameValidity {
 static boolean accepts(long expectedGeneration,long currentGeneration,long renderedAt,long now,int maxAgeMs){
  return expectedGeneration==currentGeneration && renderedAt>0 && now>=renderedAt && maxAgeMs>0 && now-renderedAt<=maxAgeMs;
 }
}
