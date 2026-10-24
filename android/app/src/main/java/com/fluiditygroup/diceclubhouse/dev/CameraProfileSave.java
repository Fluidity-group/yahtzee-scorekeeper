package com.fluiditygroup.diceclubhouse.dev;

import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;

/** A submitted storage operation owns the sheet until completion or failure. */
final class CameraProfileSave {
    private enum State { EDITING, SAVING, COMPLETED, CANCELLED }
    private State state = State.EDITING;

    boolean submit(Executor executor, Runnable write, Runnable lock, Runnable rejected) {
        synchronized(this) {
            if(state!=State.EDITING)return false;
            state=State.SAVING;
        }
        lock.run();
        try { executor.execute(write); }
        catch(RejectedExecutionException ignored) { if(failed())rejected.run(); }
        return true;
    }
    synchronized boolean cancel() {
        if(state!=State.EDITING)return false;
        state=State.CANCELLED;return true;
    }
    synchronized boolean complete() {
        if(state!=State.SAVING)return false;
        state=State.COMPLETED;return true;
    }
    synchronized boolean failed() {
        if(state!=State.SAVING)return false;
        state=State.EDITING;return true;
    }
}
