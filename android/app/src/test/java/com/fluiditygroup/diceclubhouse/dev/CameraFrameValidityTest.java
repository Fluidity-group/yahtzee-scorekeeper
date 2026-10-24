package com.fluiditygroup.diceclubhouse.dev;
import org.junit.Test;
import static org.junit.Assert.*;
public class CameraFrameValidityTest {
 @Test public void frameCrossingReconnectCannotBeAccepted(){assertFalse(CameraFrameValidity.accepts(1,2,1000,1001,1000));}
 @Test public void slowSnapshotTransferExpires(){assertFalse(CameraFrameValidity.accepts(1,1,1000,2001,1000));}
 @Test public void futureAndUnknownRenderTimestampsAreRejected(){assertFalse(CameraFrameValidity.accepts(1,1,1001,1000,1000));assertFalse(CameraFrameValidity.accepts(1,1,0,1000,1000));}
 @Test public void boundedFreshRenderIsAccepted(){assertTrue(CameraFrameValidity.accepts(1,1,1000,2000,1000));}
}
