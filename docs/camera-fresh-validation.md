# Fresh webcam validation — 28 September 2026

Export: camera-labelled-examples (1).json. Contains 21 samples: 10 previous development examples, a complete new 10-roll session, and one additional standalone webcam example. Old sample IDs were excluded before evaluation.

The new session contains rolls 1–10 from session eca57ab0-3323-4697-9086-3e487b017f91. All were captured using opencv-pips-0.2. Their saved predictions were compared with user-confirmed labels and independently replayed through the current reader, without changing recognition code or thresholds.

- Exact five-dice rolls: 6/10.
- Correctly located/read dice: 46/50.
- Accepted incorrect readings: 0 in this collection.
- Unreadable dice: 4/50.
- Failures: tray-boundary rejection on rolls 4, 6 and 7; pip-pattern/threshold disagreement on the one-pip die in roll 8.
- The separate standalone example matched all five values and is excluded from the session figures.

The baseline reader replay on these same new frames returned only 11 readable dice and zero complete exact rolls. Its centre-matched correct count was 8, using the evaluator's normalized position tolerance; this does not by itself prove all remaining baseline readings were incorrect.

Visual inspection of roll 4 shows the rejected six beside the rim. The saved polygon cuts into the near-edge die contour. Next investigate calibration fit and narrowly bounded boundary tolerance, without accepting dice outside the intended tray. Separately inspect the rejected one-pip face. Keep these results as the pre-tuning validation checkpoint; if tuned against this set, obtain another fresh validation batch.

Hand detection was enabled on six session frames, with Player 2 suggested on four and two unclear. No user-confirmed player ground truth is present, so player accuracy cannot be scored.
