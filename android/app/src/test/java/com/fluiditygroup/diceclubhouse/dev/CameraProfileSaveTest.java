package com.fluiditygroup.diceclubhouse.dev;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.RejectedExecutionException;
import org.junit.Test;
import static org.junit.Assert.*;

public class CameraProfileSaveTest {
    @Test public void blockedExecutorCannotReportCancellationAfterSaveWasSubmitted() {
        CameraProfileSave save=new CameraProfileSave();
        List<Runnable> queued=new ArrayList<>();
        List<String> events=new ArrayList<>();
        assertTrue(save.submit(queued::add,()->{events.add("write");assertTrue(save.complete());events.add("resolved");},()->events.add("locked"),()->events.add("rejected")));
        assertEquals(java.util.Arrays.asList("locked"),events);
        assertFalse(save.cancel());
        assertFalse(save.submit(queued::add,()->events.add("duplicate"),()->events.add("locked-again"),()->events.add("rejected")));
        assertEquals(1,queued.size());
        queued.get(0).run();
        assertEquals(java.util.Arrays.asList("locked","write","resolved"),events);
        assertFalse(save.cancel());assertFalse(save.complete());
    }
    @Test public void cancellationBeforeSubmissionNeverQueuesAWritingOperation() {
        CameraProfileSave save=new CameraProfileSave();List<Runnable> queued=new ArrayList<>();
        assertTrue(save.cancel());assertFalse(save.cancel());
        assertFalse(save.submit(queued::add,()->fail("write"),()->fail("lock"),()->fail("rejected")));
        assertTrue(queued.isEmpty());
    }
    @Test public void rejectedExecutorRestoresEditingAndAllowsCancellation() {
        CameraProfileSave save=new CameraProfileSave();List<String> events=new ArrayList<>();
        assertTrue(save.submit(task->{throw new RejectedExecutionException();},()->fail("write"),()->events.add("locked"),()->events.add("restored")));
        assertEquals(java.util.Arrays.asList("locked","restored"),events);
        assertTrue(save.cancel());
    }
    @Test public void failedStorageCanBeRetriedWithoutFalseCancellation() {
        CameraProfileSave save=new CameraProfileSave();List<Runnable> queued=new ArrayList<>();
        save.submit(queued::add,()->assertTrue(save.failed()),()->{},()->fail("rejected"));
        assertFalse(save.cancel());queued.remove(0).run();
        assertTrue(save.submit(queued::add,()->assertTrue(save.complete()),()->{},()->fail("rejected")));
        assertFalse(save.cancel());queued.remove(0).run();assertFalse(save.failed());
    }
    @Test public void failedStorageAllowsNormalCancellation() {
        CameraProfileSave save=new CameraProfileSave();List<Runnable> queued=new ArrayList<>();
        save.submit(queued::add,()->assertTrue(save.failed()),()->{},()->fail("rejected"));
        queued.get(0).run();assertTrue(save.cancel());assertFalse(save.complete());
    }
}
