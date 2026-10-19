export type SortDir = 'asc' | 'desc';

export type ExamListItem = {
  id: number;
  name: string;
  exam_date: string | null;
  exam_type?: string;
};

export type AnalyticsSummary = {
  total: number;
  avg_net: number;
  median_net: number;
  mode_net: number;
  min_net: number;
  max_net: number;
  stddev_net: number;
  variance: number;
};

export type DistBin = { start: number; end: number; count: number };

export type CourseDistribution = {
  course_id: number;
  course_name: string;
  distribution: DistBin[];
};

export type CourseAvg = {
  course_id: number;
  course_name: string;
  avg_net: number;
  avg_point: number;
  correct: number;
  wrong: number;
  blank: number;
};

export type ClassAvg = {
  classroom_id: number;
  classroom_name: string;
  total: number;
  avg_net: number;
};

export type ResultRow = {
  id: number;
  student_no: string;
  booklet_type: string;
  total_net: number;
  total_point: number;
  rank: number;
  course_scores: Record<
    number,
    { correct: number; wrong: number; blank: number; net: number; point: number }
  >;
  student?: {
    id: number;
    name: string;
    school_no: string;
    classroom?: { id: number; name: string };
  };
};

export type StudentOption = {
  id: number;
  name: string;
  school_no?: string;
  classroom?: { id: number; name: string } | null;
};

export type Classroom = {
  id: number;
  name: string;
  education_level_id?: number | null;
  grade_level?: number | null;
  campus_id?: number | null;
  branch_id?: number | null;
  branch?: { id: number; name: string } | null;
};

export type StudentAnalytics = {
  student: {
    id: number;
    name: string;
    school_no: string;
    classroom?: { id: number; name: string };
  };
  result: {
    id: number;
    total_net: number;
    total_point: number;
    rank: number;
    booklet_type: string;
  };
  exam_stats: { mean: number; median: number; mode: number; variance: number; stddev: number };
  exam_avg: number;
  class_avg: number;
  percentile: number;
  exam_total: number;
  course_scores: {
    course_id: number;
    course_name: string;
    net: number;
    correct: number;
    wrong: number;
    blank: number;
  }[];
  exam_summaries?: { exam_id: number; exam_name: string; total_net: number; total_point?: number }[];
  topic_analysis?:
    | {
        topic_id: number;
        topic_name: string;
        course_id: number;
        course_name: string;
        correct: number;
        wrong: number;
        blank: number;
        total?: number;
        success_rate?: number;
        net?: number;
      }[]
    | Record<number, Record<number, { topic_id: number; topic_name: string; correct: number; wrong: number; blank: number }>>;
  questions?: {
    exam_id: number;
    exam_name?: string;
    course_id: number;
    course_name: string;
    question_no: number;
    student_qno?: number;
    topic_id: number;
    topic_name: string;
    topic_type?: string;
    given_answer: string;
    correct_answer: string;
    status: 'correct' | 'wrong' | 'blank';
  }[];
  wrong_blank_questions?: {
    exam_id: number;
    exam_name?: string;
    course_id: number;
    course_name: string;
    question_no: number;
    student_qno?: number;
    topic_id: number;
    topic_name: string;
    given_answer: string;
    correct_answer: string;
    status: 'correct' | 'wrong' | 'blank';
  }[];
  exam_ids?: number[];
  exam_count?: number;
};

export type ClassAnalytics = {
  class_avg: number;
  exam_avg: number;
  student_count: number;
  class_stats: { mean: number; median: number; mode: number; variance: number; stddev: number };
  students: {
    id: number;
    name: string;
    school_no: string;
    total_net: number;
    total_point: number;
    rank: number;
    below_avg: boolean;
    result_id: number;
  }[];
  course_averages: {
    course_id: number;
    course_name: string;
    avg_net: number;
    correct: number;
    wrong: number;
    blank: number;
  }[];
  topic_difficulty: {
    topic_id: number;
    topic_name: string;
    wrong_ratio: number;
    total: number;
    course_name?: string;
  }[];
};

export type CompareSeries = {
  exam_id: number;
  exam_name: string;
  exam_date: string | null;
  exam_type: string;
  avg_net: number;
  min_net: number;
  max_net: number;
  total: number;
  course_avgs: { course_id: number; avg_net: number }[];
  regression: { slope: number; intercept: number; r_squared: number };
};
