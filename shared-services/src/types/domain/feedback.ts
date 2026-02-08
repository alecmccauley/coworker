import type { BaseEntity } from "../crud.js";

export type FeedbackType = "bug" | "improvement" | "like";

export interface FeedbackScreenshot {
  dataBase64: string;
  mime: string;
  width: number;
  height: number;
  byteSize: number;
  capturedAt: string;
}

export interface Feedback extends BaseEntity {
  userId: string | null;
  type: FeedbackType;
  message: string;
  canContact: boolean;
  includeScreenshot: boolean;
  screenshotMime: string | null;
  screenshotWidth: number | null;
  screenshotHeight: number | null;
  screenshotSize: number | null;
  screenshotCapturedAt: string | null;
}

export interface CreateFeedbackInput {
  type: FeedbackType;
  message: string;
  canContact: boolean;
  includeScreenshot: boolean;
  screenshot?: FeedbackScreenshot;
}
