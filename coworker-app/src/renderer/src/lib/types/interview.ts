export interface InterviewOption {
  label: string;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  options: InterviewOption[];
}

export type InterviewAnswers = Record<string, string>;

export interface InterviewData {
  _type: "interview";
  coworkerId: string;
  questions: InterviewQuestion[];
  answers: InterviewAnswers | null;
}

export function parseInterviewData(
  contentShort: string | null | undefined,
): InterviewData | null {
  if (!contentShort) return null;
  try {
    const parsed = JSON.parse(contentShort) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "_type" in parsed &&
      (parsed as InterviewData)._type === "interview"
    ) {
      return parsed as InterviewData;
    }
  } catch {
    // Not JSON or not interview data
  }
  return null;
}

export function formatInterviewAnswersAsText(data: InterviewData): string {
  if (!data.answers) return "";
  const lines: string[] = [];
  for (const question of data.questions) {
    const answer = data.answers[question.id];
    if (!answer) continue;
    const displayAnswer = answer.startsWith("other:")
      ? answer.slice(6)
      : answer;
    lines.push(`${question.question} ${displayAnswer}`);
  }
  return lines.join("\n");
}
