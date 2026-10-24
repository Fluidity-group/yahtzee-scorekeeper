package com.fluiditygroup.diceclubhouse.dev;

import org.junit.Test;
import static org.junit.Assert.*;

public class CameraFrameTimingTest {
    @Test public void stageDurationsUseNativeElapsedClockAndPreserveFractionalMilliseconds() {
        C121CameraPlugin.FrameTiming timing = new C121CameraPlugin.FrameTiming(
            1000000000L, 1002500000L, 1020000000L, 1027250000L, 995L, 1030L);
        assertEquals(2.5d, timing.snapshotExtractionMs, 0.000001d);
        assertEquals(7.25d, timing.pngEncodeAndWriteMs, 0.000001d);
        assertEquals(35d, timing.nativeRenderAgeMs, 0d);
        assertFalse(timing.capped);
    }

    @Test public void delaysOutsideStagesAreNotMislabelledAsEncodingOrExtraction() {
        C121CameraPlugin.FrameTiming timing = new C121CameraPlugin.FrameTiming(
            1000000000L, 1001000000L, 2000000000L, 2002000000L, 900L, 2010L);
        assertEquals(1d, timing.snapshotExtractionMs, 0d);
        assertEquals(2d, timing.pngEncodeAndWriteMs, 0d);
        assertEquals(1110d, timing.nativeRenderAgeMs, 0d);
    }

    @Test public void diagnosticsAreCappedAndDiscloseTheCap() {
        C121CameraPlugin.FrameTiming timing = new C121CameraPlugin.FrameTiming(
            0L, Long.MAX_VALUE, 0L, 61000000000L, 1L, Long.MAX_VALUE);
        assertEquals(60000d, timing.snapshotExtractionMs, 0d);
        assertEquals(60000d, timing.pngEncodeAndWriteMs, 0d);
        assertEquals(60000d, timing.nativeRenderAgeMs, 0d);
        assertTrue(timing.capped);
    }

    @Test public void clockAnomaliesCannotExposeNegativeNumbers() {
        C121CameraPlugin.FrameTiming timing = new C121CameraPlugin.FrameTiming(
            200L, 100L, -1L, 100L, 101L, 100L);
        assertEquals(0d, timing.snapshotExtractionMs, 0d);
        assertEquals(0d, timing.pngEncodeAndWriteMs, 0d);
        assertEquals(0d, timing.nativeRenderAgeMs, 0d);
        assertFalse(timing.capped);
    }
}
