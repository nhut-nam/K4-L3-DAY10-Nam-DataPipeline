// Embedded Benchmark & Observability Data for Team Nam
const PIPELINE_DATA = {
  team: "Nam",
  student: "Nguyễn Trần Nhựt Nam",
  lastRun: "2026-09-25",
  states: {
    baseline: {
      name: "Baseline (Dữ liệu sạch)",
      statusBadge: "PASSED (Clean)",
      statusColor: "#10b981",
      metrics: {
        hitRate: 100.0,
        tokenF1: 100.0,
        judgeAccuracy: 100.0,
        judgeScore: 5.0,
        totalDocs: 24,
        staleDocs: 1,
        staleRate: 4.2
      },
      qualityGate: {
        success: true,
        gxSuccess: true,
        isFresh: true,
        checks: [
          { name: "ExpectTableRowCountToBeBetween (5-5000)", success: true, detail: "Total: 24 records" },
          { name: "ExpectColumnValuesToNotBeNull (paper_id, title, text)", success: true, detail: "0 null values" },
          { name: "ExpectColumnValuesToBeUnique (paper_id)", success: true, detail: "24 unique DOIs" },
          { name: "ExpectColumnValueLengthsToBeBetween (summary >= 30, title >= 8)", success: true, detail: "Min summary: 142 chars" }
        ],
        violations: []
      }
    },
    corrupted: {
      name: "Corrupted (Dữ liệu bị tiêm lỗi)",
      statusBadge: "FAILED (Quality Violation)",
      statusColor: "#ef4444",
      metrics: {
        hitRate: 60.0,
        tokenF1: 66.9,
        judgeAccuracy: 60.0,
        judgeScore: 3.8,
        totalDocs: 22,
        staleDocs: 2,
        staleRate: 9.1
      },
      qualityGate: {
        success: false,
        gxSuccess: false,
        isFresh: true,
        checks: [
          { name: "ExpectTableRowCountToBeBetween (5-5000)", success: true, detail: "Total: 22 records" },
          { name: "ExpectColumnValuesToNotBeNull (paper_id, title, text)", success: true, detail: "1 blank summary" },
          { name: "ExpectColumnValuesToBeUnique (paper_id)", success: false, detail: "Duplicate rows injected" },
          { name: "ExpectColumnValueLengthsToBeBetween (summary >= 30, title >= 8)", success: false, detail: "Title 'AI' < 8 chars, Blank summary = 0 chars" }
        ],
        violations: [
          "ExpectColumnValuesToBeUnique(paper_id): Duplicates found",
          "ExpectColumnValueLengthsToBeBetween(summary): Blank summary (0 chars)",
          "ExpectColumnValueLengthsToBeBetween(title): Truncated title ('AI' = 2 chars)"
        ]
      }
    },
    repaired: {
      name: "Repaired (Tự phục hồi từ Raw)",
      statusBadge: "RECOVERED (100% Healed)",
      statusColor: "#3b82f6",
      metrics: {
        hitRate: 100.0,
        tokenF1: 100.0,
        judgeAccuracy: 100.0,
        judgeScore: 5.0,
        totalDocs: 24,
        staleDocs: 1,
        staleRate: 4.2
      },
      qualityGate: {
        success: true,
        gxSuccess: true,
        isFresh: true,
        checks: [
          { name: "ExpectTableRowCountToBeBetween (5-5000)", success: true, detail: "Total: 24 records" },
          { name: "ExpectColumnValuesToNotBeNull (paper_id, title, text)", success: true, detail: "0 null values" },
          { name: "ExpectColumnValuesToBeUnique (paper_id)", success: true, detail: "Deduplicated successfully" },
          { name: "ExpectColumnValueLengthsToBeBetween (summary >= 30, title >= 8)", success: true, detail: "Restored to full length" }
        ],
        violations: []
      }
    }
  },
  corruptions: [
    { type: "1. Drop Latest Records", desc: "Bỏ rơi 20% bài báo mới nhất (4 bài). Khiến Retrieval Hit Rate sụt giảm nghiêm trọng đối với các truy vấn thời sự.", severity: "Critical" },
    { type: "2. Blank Summary", desc: "Xóa rỗng tóm tắt ở một số dòng. Mô phỏng lỗi scraping/parsing ra chuỗi rỗng.", severity: "High" },
    { type: "3. Inject Noise", desc: "Chèn chuỗi ký tự rác '### [GARBAGE_NOISE_$$$] ###' vào tóm tắt làm biến dạng vector embedding.", severity: "High" },
    { type: "4. Truncate Title", desc: "Cắt ngắn tiêu đề xuống còn 2 ký tự ('AI' < 8 ký tự), vi phạm tiêu chuẩn schema metadata.", severity: "Medium" },
    { type: "5. Stale Date", desc: "Lùi ngày xuất bản về 365 ngày trước, mô phỏng sự cố trôi dạt độ tươi (Data Drift / Freshness violation).", severity: "Medium" },
    { type: "6. Duplicate Rows", desc: "Nhân đôi các bản ghi, vi phạm tính duy nhất (Uniqueness) và làm loãng xếp hạng của ChromaDB.", severity: "High" }
  ],
  sampleQuestions: [
    {
      id: "eval_001",
      type: "summary",
      question: "What is the summary of the paper 'Continuous Benchmark Evaluation for Enterprise Retrieval Pipelines'?",
      groundTruth: "Static benchmarks fail to capture domain drift in enterprise knowledge bases.",
      baselineAnswer: "Static benchmarks fail to capture domain drift in enterprise knowledge bases.",
      corruptedAnswer: "### [GARBAGE_NOISE_$$$] ### An extended empirical study on tatic benchmarks fail to capture domain drift in enterprise knowledge bases.",
      repairedAnswer: "Static benchmarks fail to capture domain drift in enterprise knowledge bases.",
      baselineHit: true,
      corruptedHit: false,
      repairedHit: true,
      corruptedJudge: "Score: 2/5 (Incorrect) — Model answer contains irrelevant text ('### [GARBAGE_NOISE_$$$] ###') and noisy tokens."
    },
    {
      id: "eval_002",
      type: "authors",
      question: "Who authored the paper 'Multi-Agent Consensus for High-Stakes Fact Verification'?",
      groundTruth: "Phong Vu, Ngan Hoang",
      baselineAnswer: "Phong Vu, Ngan Hoang",
      corruptedAnswer: "I don't know from the indexed corpus (Document dropped in 20% latest cutoff).",
      repairedAnswer: "Phong Vu, Ngan Hoang",
      baselineHit: true,
      corruptedHit: false,
      repairedHit: true,
      corruptedJudge: "Score: 1/5 (Missing) — The required paper was dropped by corruption, leading to silent retrieval failure."
    },
    {
      id: "eval_003",
      type: "date",
      question: "When was the paper 'Agentic Retrieval-Augmented Generation for Knowledge-Intensive Tasks' published?",
      groundTruth: "2026-05-20",
      baselineAnswer: "2026-05-20",
      corruptedAnswer: "2026-05-20",
      repairedAnswer: "2026-05-20",
      baselineHit: true,
      corruptedHit: true,
      repairedHit: true,
      corruptedJudge: "Score: 5/5 (Correct) — Exact date match."
    },
    {
      id: "eval_004",
      type: "categories",
      question: "What categories does the paper 'Data Observability and Quality Gates for Production RAG Systems' belong to?",
      groundTruth: "Software Engineering, Data Systems",
      baselineAnswer: "Software Engineering, Data Systems",
      corruptedAnswer: "Software Engineering, Data Systems",
      repairedAnswer: "Software Engineering, Data Systems",
      baselineHit: true,
      corruptedHit: true,
      repairedHit: true,
      corruptedJudge: "Score: 5/5 (Correct) — Correct category extraction."
    }
  ]
};
