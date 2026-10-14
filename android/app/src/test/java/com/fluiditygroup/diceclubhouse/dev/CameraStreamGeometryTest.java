package com.fluiditygroup.diceclubhouse.dev;

import org.junit.Test;
import static org.junit.Assert.*;

public class CameraStreamGeometryTest {
    @Test public void geometryChangeDuringEncodingRejectsEvenAFreshSameSessionSnapshot() {
        assertFalse(C121CameraPlugin.snapshotStillValid(1L,2L,3L,3L,1234L,1250L,1000));
        assertTrue(C121CameraPlugin.snapshotStillValid(1L,1L,3L,3L,1234L,1250L,1000));
        assertFalse(C121CameraPlugin.snapshotStillValid(1L,1L,3L,4L,1234L,1250L,1000));
        assertFalse(C121CameraPlugin.snapshotStillValid(1L,1L,3L,3L,1234L,2235L,1000));
    }
    @Test public void changedLiveGeometryInvalidatesPreviousRenderedPixels() {
        C121CameraPlugin.GeometryUpdate update = new C121CameraPlugin.GeometryUpdate(1920,1080,1234L,960,540,0,1f);
        assertTrue(update.changed);
        assertEquals(960,update.width);
        assertEquals(540,update.height);
        assertEquals(0L,update.renderedAt);
        assertFalse(CameraFrameValidity.accepts(1,1,update.renderedAt,1250L,1000));
    }

    @Test public void duplicateSizeEventPreservesFreshness() {
        C121CameraPlugin.GeometryUpdate update = new C121CameraPlugin.GeometryUpdate(1920,1080,1234L,1920,1080,0,1f);
        assertFalse(update.changed);
        assertEquals(1234L,update.renderedAt);
        assertTrue(CameraFrameValidity.accepts(1,1,update.renderedAt,1250L,1000));
    }

    @Test public void initialDimensionsRequireFirstPixelCallback() {
        C121CameraPlugin.GeometryUpdate update = new C121CameraPlugin.GeometryUpdate(0,0,0L,2560,1440,0,1f);
        assertTrue(update.changed);
        assertEquals(0L,update.renderedAt);
    }

    @Test public void unsupportedDimensionsRotationAndPixelRatioAreRejected() {
        int[][] invalid={{0,1080,0},{1920,0,0},{4097,1080,0},{1920,4097,0},{1920,1080,90}};
        for(int[] geometry:invalid)assertThrows(IllegalArgumentException.class,()->new C121CameraPlugin.GeometryUpdate(0,0,0L,geometry[0],geometry[1],geometry[2],1f));
        assertThrows(IllegalArgumentException.class,()->new C121CameraPlugin.GeometryUpdate(0,0,0L,1920,1080,0,1.2f));
        assertThrows(IllegalArgumentException.class,()->new C121CameraPlugin.GeometryUpdate(0,0,0L,1920,1080,0,Float.NaN));
    }
}
