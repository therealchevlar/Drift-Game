import { CarPhysicsState, DriftScoreState } from '../types';
import { soundEngine } from './audio';

export class DriftScoreManager {
  private currentPoints = 0;
  private comboTime = 0;
  private multiplier = 1.0;
  private previousMultiplierLevel = 1;
  private totalScore = 0;
  private bestScore = 0;

  private chainGraceTimer = 0;
  private readonly maxGraceDuration = 1.8; // 1.8 seconds to transition between drifts
  private isDriftingActive = false;
  private isChainActive = false;
  private driftRatingText = '';

  constructor() {
    // Load high score from localStorage if available
    try {
      const saved = localStorage.getItem('drift_playground_best_score');
      if (saved) {
        this.bestScore = parseInt(saved, 10) || 0;
      }
    } catch {
      // Ignore
    }
  }

  public update(dt: number, carState: CarPhysicsState): DriftScoreState {
    const delta = Math.min(0.05, Math.max(0.001, dt));

    // Collision punishment: heavy crash breaks the combo!
    if (carState.colliding && this.currentPoints > 50) {
      this.currentPoints = 0;
      this.comboTime = 0;
      this.multiplier = 1.0;
      this.isChainActive = false;
      this.chainGraceTimer = 0;
      this.driftRatingText = 'CRASH! COMBO LOST';
      return this.getState();
    }

    const satisfiesDrift = carState.speedKmh > 16 && carState.driftAngle >= 12;

    if (satisfiesDrift) {
      this.isDriftingActive = true;
      this.isChainActive = true;
      this.chainGraceTimer = this.maxGraceDuration; // Reset grace timer

      this.comboTime += delta;

      // Multiplier tier based on continuous slide duration
      let currentLevel = 1;
      if (this.comboTime > 14) {
        this.multiplier = 5.0;
        currentLevel = 5;
      } else if (this.comboTime > 9) {
        this.multiplier = 4.0;
        currentLevel = 4;
      } else if (this.comboTime > 5.5) {
        this.multiplier = 3.0;
        currentLevel = 3;
      } else if (this.comboTime > 2.5) {
        this.multiplier = 2.0;
        currentLevel = 2;
      } else if (this.comboTime > 1.0) {
        this.multiplier = 1.5;
        currentLevel = 1;
      } else {
        this.multiplier = 1.0;
        currentLevel = 1;
      }

      if (currentLevel > this.previousMultiplierLevel) {
        soundEngine.triggerComboChime(currentLevel);
        this.previousMultiplierLevel = currentLevel;
      }

      // Rating text
      if (this.multiplier >= 4.0) {
        this.driftRatingText = 'DRIFT GOD!';
      } else if (this.multiplier >= 3.0) {
        this.driftRatingText = 'INSANE SLIDE!';
      } else if (this.multiplier >= 2.0) {
        this.driftRatingText = 'GREAT ANGLE!';
      } else {
        this.driftRatingText = 'DRIFTING';
      }

      // Accumulate score
      // Points scale with angle and speed
      const angleWeight = carState.driftAngle * 1.2;
      const speedWeight = carState.speedKmh * 0.8;
      const pointsPerSec = (angleWeight + speedWeight) * this.multiplier * 3.5;

      this.currentPoints += pointsPerSec * delta;
    } else {
      this.isDriftingActive = false;

      if (this.isChainActive) {
        // Counting down transition grace period
        this.chainGraceTimer -= delta;

        if (this.chainGraceTimer <= 0) {
          // Grace period expired: Bank score!
          this.bankCurrentScore();
        }
      }
    }

    return this.getState();
  }

  private bankCurrentScore() {
    const banked = Math.round(this.currentPoints);
    if (banked > 80) {
      this.totalScore += banked;
      soundEngine.triggerScoreBankSound();

      if (this.totalScore > this.bestScore) {
        this.bestScore = this.totalScore;
        try {
          localStorage.setItem('drift_playground_best_score', this.bestScore.toString());
        } catch {
          // Ignore
        }
      }
    }

    this.currentPoints = 0;
    this.comboTime = 0;
    this.multiplier = 1.0;
    this.previousMultiplierLevel = 1;
    this.isChainActive = false;
    this.chainGraceTimer = 0;
    this.driftRatingText = '';
  }

  public reset() {
    this.currentPoints = 0;
    this.comboTime = 0;
    this.multiplier = 1.0;
    this.previousMultiplierLevel = 1;
    this.isChainActive = false;
    this.chainGraceTimer = 0;
    this.driftRatingText = '';
  }

  public getState(): DriftScoreState {
    const gracePct = this.isChainActive ? Math.max(0, Math.min(1, this.chainGraceTimer / this.maxGraceDuration)) : 0;

    return {
      currentPoints: Math.round(this.currentPoints),
      combo: Math.round(this.comboTime * 10) / 10,
      multiplier: this.multiplier,
      totalScore: this.totalScore,
      bestScore: this.bestScore,
      isChainActive: this.isChainActive,
      chainTimerPct: gracePct,
      driftRatingText: this.driftRatingText,
    };
  }
}
