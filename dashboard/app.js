// Interactive Dashboard Logic for Team Nam
document.addEventListener("DOMContentLoaded", () => {
  // Case Data Definitions for Step-by-Step Cleaning Demonstration
  const CLEANING_CASES = [
    {
      title: "Case 1: Chuẩn hóa bài báo từ Crossref REST API (Thành công)",
      type: "clean",
      raw: {
        DOI: "10.1145/3637528.3671801",
        title: ["Agentic Retrieval-Augmented Generation for Knowledge-Intensive Tasks"],
        abstract: "<jats:p>Retrieval-Augmented Generation (RAG) significantly improves large language model accuracy by grounding responses in retrieved passages. &lt;jats:sec&gt;We explore agentic multi-hop &amp;quot;reasoning&amp;quot; &amp;amp; routing across heterogeneous vector indices.&lt;/jats:sec&gt;</jats:p>",
        author: [
          { given: "Minh", family: "Nguyen" },
          { given: "Hoang", family: "Le" }
        ],
        subject: ["Artificial Intelligence", "Information Retrieval"],
        published: { "date-parts": [[2026, 5, 20]] },
        URL: "https://doi.org/10.1145/3637528.3671801"
      },
      steps: [
        {
          num: 0,
          title: "Bước 0: Dữ liệu thô nguyên bản (Raw Ingestion)",
          badge: "Raw State",
          explanation: "Dữ liệu JSON gốc vừa kéo từ Crossref API về (được cất giữ tại <code>data/raw/crossref_response.json</code>). Hãy để ý trường <code>abstract</code> chứa các thẻ rác XML <code>&lt;jats:p&gt;</code> và ký tự mã hóa entity <code>&amp;quot;</code>, <code>&amp;amp;</code>.",
          leftTitle: "API ENDPOINT RESPONSE (RAW JSON)",
          leftBadge: "Raw Payload",
          leftCode: JSON.stringify({
            DOI: "10.1145/3637528.3671801",
            title: ["Agentic Retrieval-Augmented Generation for Knowledge-Intensive Tasks"],
            abstract: "<jats:p>Retrieval-Augmented Generation (RAG) significantly improves large language model accuracy... &lt;jats:sec&gt;We explore agentic multi-hop &quot;reasoning&quot; &amp; routing...&lt;/jats:sec&gt;</jats:p>",
            published: { "date-parts": [[2026, 5, 20]] }
          }, null, 2),
          rightTitle: "TRƯỜNG ABSTRACT NGUYÊN GỐC (CHƯA LÀM SẠCH)",
          rightBadge: "Dirty Abstract",
          rightCode: "<jats:p>Retrieval-Augmented Generation (RAG) significantly improves large language model accuracy by grounding responses in retrieved passages. <jats:sec>We explore agentic multi-hop &quot;reasoning&quot; &amp; routing across heterogeneous vector indices.</jats:sec></jats:p>",
          gatePass: true,
          gateDesc: "Dữ liệu đang ở trạng thái Bronze/Raw Lineage trước khi biến đổi."
        },
        {
          num: 1,
          title: "Bước 1: Bóc thẻ HTML/XML rác (Tag Stripping)",
          badge: "Stage 1",
          explanation: "Áp dụng biểu thức chính quy <code>re.sub(r'<[^>]+>', ' ', text)</code>. Mọi thẻ <code>&lt;jats:p&gt;</code>, <code>&lt;jats:sec&gt;</code>, <code>&lt;/jats:p&gt;</code> được thay thế bằng một dấu cách để tránh 2 từ bị dính chùm vào nhau.",
          leftTitle: "TRƯỚC KHI BÓC THẺ (CÒN THẺ JATS XML)",
          leftBadge: "Raw Abstract",
          leftCode: "<jats:p>Retrieval-Augmented Generation (RAG) significantly improves large language model accuracy by grounding responses in retrieved passages. <jats:sec>We explore agentic multi-hop &quot;reasoning&quot; &amp; routing across heterogeneous vector indices.</jats:sec></jats:p>",
          rightTitle: "SAU KHI BÓC THẺ (ĐÃ LOẠI BỎ THẺ XML)",
          rightBadge: "Tags Stripped",
          rightCode: " Retrieval-Augmented Generation (RAG) significantly improves large language model accuracy by grounding responses in retrieved passages.   We explore agentic multi-hop &quot;reasoning&quot; &amp; routing across heterogeneous vector indices.  ",
          gatePass: true,
          gateDesc: "Đã loại bỏ 100% các tag XML và HTML độc hại."
        },
        {
          num: 2,
          title: "Bước 2: Giải mã ký tự thực thể HTML (Entity Decoding)",
          badge: "Stage 2",
          explanation: "Sử dụng hàm <code>html.unescape(text)</code> để khôi phục các ký tự bị mã hóa thành ký tự gốc: <code>&amp;quot;</code> ➔ <code>\"</code>, <code>&amp;amp;</code> ➔ <code>&</code>.",
          leftTitle: "TRƯỚC KHI GIẢI MÃ (CÒN KÝ TỰ MÃ HÓA)",
          leftBadge: "Encoded Entities",
          leftCode: "We explore agentic multi-hop &quot;reasoning&quot; &amp; routing across heterogeneous vector indices.",
          rightTitle: "SAU KHI GIẢI MÃ (KÝ TỰ GỐC ĐÃ KHÔI PHỤC)",
          rightBadge: "Decoded Text",
          rightCode: "We explore agentic multi-hop \"reasoning\" & routing across heterogeneous vector indices.",
          gatePass: true,
          gateDesc: "Các ký tự dấu nháy và ký hiệu toán học đã hiển thị chuẩn xác."
        },
        {
          num: 3,
          title: "Bước 3: Chuẩn hóa khoảng trắng & Text (Whitespace Normalization)",
          badge: "Stage 3",
          explanation: "Áp dụng <code>normalize_whitespace()</code> bằng <code>re.sub(r'\\s+', ' ', value).strip()</code>. Mọi khoảng cách thừa, ký tự xuống dòng (\\n, \\t) được gộp lại thành đúng 1 dấu cách duy nhất.",
          leftTitle: "TEXT CÒN NHIỀU KHOẢNG TRẮNG VÀ XUỐNG DÒNG",
          leftBadge: "Irregular Spaces",
          leftCode: "   Retrieval-Augmented   Generation (RAG) significantly   improves...   \n\n   We explore agentic...   ",
          rightTitle: "TEXT ĐÃ ĐƯỢC ÉP GỌN GÀNG (CANONICAL TEXT)",
          rightBadge: "Normalized",
          rightCode: "Retrieval-Augmented Generation (RAG) significantly improves large language model accuracy by grounding responses in retrieved passages. We explore agentic multi-hop \"reasoning\" & routing across heterogeneous vector indices.",
          gatePass: true,
          gateDesc: "Chuỗi văn bản đạt chuẩn độ dài và không còn ký tự vô hình."
        },
        {
          num: 4,
          title: "Bước 4: Parse ngày tháng & Giám sát độ tươi (Freshness Check)",
          badge: "Stage 4",
          explanation: "Bóc tách mảng <code>[2026, 5, 20]</code> thành chuỗi ngày <code>2026-05-20</code>. Tính toán <code>age_days = (run_date - published).days</code> để đo độ tươi theo Freshness SLA (ngưỡng 180 ngày).",
          leftTitle: "NGÀY THÔ TRONG CROSSREF JSON",
          leftBadge: "Raw Date Parts",
          leftCode: JSON.stringify({ "date-parts": [[2026, 5, 20]] }, null, 2),
          rightTitle: "CHUẨN HÓA NGÀY & TÍNH ĐỘ TƯƠI",
          rightBadge: "Freshness SLA",
          rightCode: "published: \"2026-05-20\"\nrun_date:  \"2026-09-25\"\nage_days:  128 days (Nhỏ hơn ngưỡng 180 ngày)\nTrạng thái: FRESH (Hợp lệ, không bị cũ)",
          gatePass: true,
          gateDesc: "Tỷ lệ bài báo cũ đạt SLA an toàn (4.2% < 25%)."
        },
        {
          num: 5,
          title: "Bước 5: Đóng gói khuôn ngữ cảnh nhúng (text_for_embedding)",
          badge: "Stage 5",
          explanation: "Ghép nối các trường đã làm sạch thành một cấu trúc 5 phần chuẩn mực (Title, Authors, Published, Categories, Summary) để chuẩn bị cấp cho mô hình <code>all-MiniLM-L6-v2</code> sinh vector.",
          leftTitle: "CÁC TRƯỜNG DỮ LIỆU ĐÃ LÀM SẠCH RIÊNG RẼ",
          leftBadge: "Discrete Fields",
          leftCode: "title = \"Agentic Retrieval-Augmented Generation...\"\nauthors = [\"Minh Nguyen\", \"Hoang Le\"]\npublished = \"2026-05-20\"\ncategories = [\"Artificial Intelligence\", \"Information Retrieval\"]\nsummary = \"Retrieval-Augmented Generation (RAG)...\"",
          rightTitle: "KHUÔN NGỮ CẢNH HOÀN CHỈNH ĐƯA VÀO VECTOR STORE",
          rightBadge: "text_for_embedding",
          rightCode: "Title: Agentic Retrieval-Augmented Generation for Knowledge-Intensive Tasks\nAuthors: Minh Nguyen, Hoang Le\nPublished: 2026-05-20\nCategories: Artificial Intelligence, Information Retrieval\nSummary: Retrieval-Augmented Generation (RAG) significantly improves large language model accuracy by grounding responses in retrieved passages. We explore agentic multi-hop \"reasoning\" & routing across heterogeneous vector indices.",
          gatePass: true,
          gateDesc: "Khuôn ngữ cảnh hoàn chỉnh sẵn sàng để index vào ChromaDB."
        },
        {
          num: 6,
          title: "Bước 6: Kiểm dịch dữ liệu qua Great Expectations 1.x (Quality Gate)",
          badge: "Quality Gate",
          explanation: "Chốt kiểm dịch chạy 4 Expectations trên RAM: Số dòng hợp lệ [5, 5000], Cột quan trọng not-null, Khóa DOI unique, Summary độ dài >= 30 ký tự. Tất cả đều đạt PASS!",
          leftTitle: "KẾT QUẢ KIỂM TRA 4 HÀNG RÀO GX 1.X",
          leftBadge: "GX 1.x Suite",
          leftCode: "[PASS] ExpectTableRowCountToBeBetween: 24 dòng (Ngưỡng 5-5000)\n[PASS] ExpectColumnValuesToNotBeNull: paper_id, title, text\n[PASS] ExpectColumnValuesToBeUnique: 100% paper_id là duy nhất\n[PASS] ExpectColumnValueLengthsToBeBetween: summary >= 30, title >= 8",
          rightTitle: "TRẠNG THÁI CUỐI CÙNG TRƯỚC KHI NẠP CHROMADB",
          rightBadge: "VERIFIED CLEAN",
          rightCode: "STATUS: PASSED (Data Quality Gate Cleared)\nFRESHNESS: FRESH (Compliant with SLA)\nACTION: ĐƯỢC PHÉP NẠP VÀO CHROMADB COLLECTION 'papers-baseline'",
          gatePass: true,
          gateDesc: "Dữ liệu được gắn dấu mộc xanh an toàn, bảo vệ RAG khỏi Silent Failure!"
        }
      ]
    },
    {
      title: "Case 2: Dữ liệu bị tiêm độc tố Corrupted (Báo động Quality Gate)",
      type: "corrupted",
      steps: [
        {
          num: 0,
          title: "Bước 0: Dữ liệu bị tiêm độc tố (Corrupted State)",
          badge: "Corrupted",
          explanation: "Mô phỏng sự cố trong thực tế: scraper lỗi làm trắng tóm tắt, xuất hiện chuỗi rác token leak, tiêu đề bị cắt cụt và bản ghi bị nhân bản trùng lặp.",
          leftTitle: "BẢN GHI BỊ LÀM BẨN (DIRTY RECORD)",
          leftBadge: "Corrupted Payload",
          leftCode: JSON.stringify({
            paper_id: "10.1145/3637528.3671823",
            title: "AI", // Bị cắt cụt < 8 ký tự
            summary: "### [GARBAGE_NOISE_$$$] ### An extended empirical study... ### [CORRUPTED_TOKEN_DATA_LEAK] ###",
            published: "2024-01-01" // Lùi ngày mốc meo
          }, null, 2),
          rightTitle: "MÔ TẢ CÁC ĐỘC TỐ ĐÃ TIÊM",
          rightBadge: "6 Flaws Injected",
          rightCode: "1. Drop 20% bài báo mới nhất\n2. Xóa trắng tóm tắt\n3. Chèn ký tự rác ### [GARBAGE_NOISE_$$$] ###\n4. Cắt title thành 'AI' (2 ký tự < 8 ký tự)\n5. Lùi ngày về 365 ngày trước (Stale Date)\n6. Nhân đôi dòng tạo bản ghi trùng lặp",
          gatePass: false,
          gateDesc: "CẢNH BÁO: Dữ liệu chứa độc tố nguy hiểm có thể gây Silent Failure!"
        },
        {
          num: 6,
          title: "Bước 6: Chốt kiểm dịch Great Expectations 1.x bắt quả tang!",
          badge: "FAILED GATE",
          explanation: "Chốt kiểm dịch GX 1.x lập tức phát hiện các bất thường về tính duy nhất, độ dài tối thiểu của tiêu đề và tóm tắt rỗng. Chuông báo động reo lên!",
          leftTitle: "DANH SÁCH EXPECTATIONS BỊ VI PHẠM",
          leftBadge: "GX 1.x Alert",
          leftCode: "[FAIL] ExpectColumnValuesToBeUnique(paper_id): Phát hiện trùng lặp bản ghi!\n[FAIL] ExpectColumnValueLengthsToBeBetween(title): Tiêu đề 'AI' chỉ có 2 ký tự (< 8 ký tự)!\n[FAIL] ExpectColumnValueLengthsToBeBetween(summary): Phát hiện bài có tóm tắt bị rỗng (0 ký tự)!",
          rightTitle: "HÀNH ĐỘNG CỦA HỆ THỐNG",
          rightBadge: "BLOCKED",
          rightCode: "STATUS: FAILED (Quality Gate Violated)\nFRESHNESS: STALE ALERT\nACTION: CHẶN ĐỨNG TOÀN TUYẾN! KHÔNG NẠP DỮ LIỆU NÀY VÀO SERVING LAYER!\nKÍCH HOẠT QUY TRÌNH IDEMPOTENT REPAIR ĐỂ CHỮA LÀNH DỮ LIỆU!",
          gatePass: false,
          gateDesc: "Quality Gate đã thành công ngăn chặn dữ liệu bẩn đầu độc mô hình AI!"
        }
      ]
    },
    {
      title: "Case 3: Sau phục hồi an toàn Idempotent Repair (Chữa lành 100%)",
      type: "repaired",
      steps: [
        {
          num: 0,
          title: "Bước 0: Kích hoạt Idempotent Self-Healing Repair",
          badge: "Self-Healing",
          explanation: "Hệ thống không cố sửa chắp vá dữ liệu lỗi, mà đọc lại toàn bộ từ bản lưu trữ thô bất biến <code>data/raw/crossref_records.json</code> và chạy lại toàn bộ quy trình làm sạch.",
          leftTitle: "BẢN SAO LƯU GỐC NGUYÊN BẢN (LINEAGE ARCHIVE)",
          leftBadge: "Raw Lineage",
          leftCode: "Đọc lại: data/raw/crossref_records.json (24 records bất biến)",
          rightTitle: "KẾT QUẢ TÁI TẠO TỰ ĐỘNG",
          rightBadge: "Clean Restored",
          rightCode: "Tái tạo lại: data/clean/papers_clean_repaired.csv (24 dòng sạch 100%)\nTính Idempotent: Chạy lại N lần kết quả vẫn đồng nhất với Baseline!",
          gatePass: true,
          gateDesc: "Cơ chế Idempotent Repair hoạt động thành công xuất sắc."
        },
        {
          num: 6,
          title: "Bước 6: Quality Gate tái kiểm định thành công & Điểm RAG hồi phục",
          badge: "RECOVERED",
          explanation: "Dữ liệu sau phục hồi đạt chuẩn GX 1.x 100%, ChromaDB được ghi đè bằng vector sạch, điểm Hit Rate và Token F1 của AI lập tức lấy lại 100% phong độ.",
          leftTitle: "KẾT QUẢ KIỂM ĐỊNH SAU REPAIR",
          leftBadge: "GX 1.x Passed",
          leftCode: "[PASS] ExpectTableRowCountToBeBetween: 24 dòng\n[PASS] ExpectColumnValuesToNotBeNull: 100% hợp lệ\n[PASS] ExpectColumnValuesToBeUnique: Khử trùng lặp triệt để\n[PASS] ExpectColumnValueLengthsToBeBetween: Đầy đủ nội dung",
          rightTitle: "HIỆU NĂNG RAG HỒI PHỤC HOÀN TOÀN",
          rightBadge: "100% Accuracy",
          rightCode: "Hit Rate:        60.0% ➔ 100.0% (+40.0% RECOVERED)\nMean Token F1:   66.9% ➔ 100.0% (+33.1% RECOVERED)\nJudge Accuracy:  60.0% ➔ 100.0% (+40.0% RECOVERED)\nJudge Score:     3.80  ➔ 5.00 / 5.0\nAI hoàn toàn thoát khỏi tình trạng Silent Failure!",
          gatePass: true,
          gateDesc: "Hệ thống chữa lành hoàn chỉnh, bảo đảm độ tin cậy tuyệt đối!"
        }
      ]
    }
  ];

  // DOM Elements for Cleaning Tab
  const cleanCaseSelect = document.getElementById("clean-case-select");
  const stepNavItems = document.querySelectorAll(".step-nav-item");
  const currentStepBadge = document.getElementById("current-step-badge");
  const currentStepTitle = document.getElementById("current-step-title");
  const stepExplanationBox = document.getElementById("step-explanation-box");
  const leftBoxTitle = document.getElementById("left-box-title");
  const leftBoxBadge = document.getElementById("left-box-badge");
  const codeInputText = document.getElementById("code-input-text");
  const rightBoxTitle = document.getElementById("right-box-title");
  const rightBoxBadge = document.getElementById("right-box-badge");
  const codeOutputText = document.getElementById("code-output-text");
  const stepGateBanner = document.getElementById("step-gate-banner");
  const bannerIcon = document.getElementById("banner-icon");
  const bannerTitle = document.getElementById("banner-title");
  const bannerDesc = document.getElementById("banner-desc");
  const bannerBadge = document.getElementById("banner-badge");
  const btnPrevStep = document.getElementById("btn-prev-step");
  const btnNextStep = document.getElementById("btn-next-step");
  const btnRunAllSteps = document.getElementById("btn-run-all-steps");
  const btnResetSteps = document.getElementById("btn-reset-steps");

  let currentCaseIdx = 0;
  let currentStepIdx = 0;
  let autoRunTimer = null;

  // Render Step Function
  function renderCleaningStep(caseIdx, stepIdx) {
    const selectedCase = CLEANING_CASES[caseIdx];
    // Find closest or matching step
    let stepData = selectedCase.steps.find(s => s.num === stepIdx);
    if (!stepData) {
      stepData = selectedCase.steps[selectedCase.steps.length - 1];
    }

    currentStepIdx = stepIdx;

    // Update Stepper Nav highlights
    stepNavItems.forEach(item => {
      const sNum = parseInt(item.dataset.step, 10);
      if (sNum === stepIdx) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
      if (sNum < stepIdx) {
        item.classList.add("completed");
      } else {
        item.classList.remove("completed");
      }
    });

    // Update Header
    currentStepBadge.textContent = `BƯỚC ${stepData.num}`;
    currentStepTitle.textContent = stepData.title;
    stepExplanationBox.innerHTML = `<p>${stepData.explanation}</p>`;

    // Update Diff Boxes
    leftBoxTitle.textContent = stepData.leftTitle;
    leftBoxBadge.textContent = stepData.leftBadge;
    codeInputText.textContent = stepData.leftCode;

    rightBoxTitle.textContent = stepData.rightTitle;
    rightBoxBadge.textContent = stepData.rightBadge;
    codeOutputText.textContent = stepData.rightCode;

    // Update Banner
    if (stepData.gatePass) {
      stepGateBanner.className = "quality-gate-banner";
      bannerIcon.textContent = "🛡️";
      bannerTitle.textContent = "Data Quality Gate: PASSED";
      bannerTitle.style.color = "var(--accent-emerald)";
      bannerDesc.textContent = stepData.gateDesc;
      bannerBadge.innerHTML = `<span class="gate-status status-pass">PASSED</span>`;
    } else {
      stepGateBanner.className = "quality-gate-banner failed";
      bannerIcon.textContent = "🚨";
      bannerTitle.textContent = "Data Quality Gate: FAILED (VIOLATION DETECTED)";
      bannerTitle.style.color = "var(--accent-rose)";
      bannerDesc.textContent = stepData.gateDesc;
      bannerBadge.innerHTML = `<span class="gate-status status-fail">FAILED</span>`;
    }

    // Button states
    btnPrevStep.disabled = (stepIdx === 0);
    btnNextStep.disabled = (stepIdx >= 6);
    btnNextStep.textContent = (stepIdx >= 6) ? "Hoàn tất luồng ✓" : "Bước tiếp theo →";
  }

  // Event Listeners for Stepper
  cleanCaseSelect.addEventListener("change", (e) => {
    currentCaseIdx = parseInt(e.target.value, 10);
    currentStepIdx = 0;
    renderCleaningStep(currentCaseIdx, 0);
  });

  stepNavItems.forEach(item => {
    item.addEventListener("click", () => {
      const sNum = parseInt(item.dataset.step, 10);
      renderCleaningStep(currentCaseIdx, sNum);
    });
  });

  btnPrevStep.addEventListener("click", () => {
    if (currentStepIdx > 0) {
      renderCleaningStep(currentCaseIdx, currentStepIdx - 1);
    }
  });

  btnNextStep.addEventListener("click", () => {
    if (currentStepIdx < 6) {
      renderCleaningStep(currentCaseIdx, currentStepIdx + 1);
    }
  });

  btnResetSteps.addEventListener("click", () => {
    clearInterval(autoRunTimer);
    renderCleaningStep(currentCaseIdx, 0);
  });

  btnRunAllSteps.addEventListener("click", () => {
    clearInterval(autoRunTimer);
    let step = 0;
    renderCleaningStep(currentCaseIdx, 0);
    autoRunTimer = setInterval(() => {
      step++;
      if (step <= 6) {
        renderCleaningStep(currentCaseIdx, step);
      } else {
        clearInterval(autoRunTimer);
      }
    }, 1200);
  });

  // Sandbox Live Sanitizer Implementation
  function liveCleanStr(inputStr) {
    if (!inputStr) return "";
    // Step 1: Strip XML/HTML tags
    let stripped = inputStr.replace(/<[^>]+>/g, " ");
    // Step 2: Unescape HTML entities
    let unescaped = stripped
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");
    // Step 3: Normalize whitespace
    return unescaped.replace(/\s+/g, " ").trim();
  }

  const sandboxInput = document.getElementById("sandbox-input");
  const sandboxOutput = document.getElementById("sandbox-output");
  const btnSandboxClean = document.getElementById("btn-sandbox-clean");

  btnSandboxClean.addEventListener("click", () => {
    const rawVal = sandboxInput.value;
    const cleaned = liveCleanStr(rawVal);
    sandboxOutput.textContent = cleaned || "(Chuỗi sau làm sạch rỗng)";
  });

  // Main Tabs Switching
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));

      btn.classList.add("active");
      const targetTabId = `tab-${btn.dataset.tab}`;
      document.getElementById(targetTabId)?.classList.add("active");
    });
  });

  // Initial render of Tab 1
  renderCleaningStep(0, 0);

  // ==================== TAB 2 & 3 LOGIC (OVERALL OBSERVABILITY) ====================
  const stateBtns = document.querySelectorAll(".state-btn");
  const hitRateEl = document.getElementById("kpi-hit-rate");
  const tokenF1El = document.getElementById("kpi-token-f1");
  const judgeScoreEl = document.getElementById("kpi-judge-score");
  const totalDocsEl = document.getElementById("kpi-total-docs");
  const gateStatusBadge = document.getElementById("gate-overall-badge");
  const gateListEl = document.getElementById("gate-expectations-list");
  const violationsPanel = document.getElementById("violations-panel");
  const violationsList = document.getElementById("violations-list");
  const freshnessStatusEl = document.getElementById("freshness-status-text");
  const freshnessBarEl = document.getElementById("freshness-bar");

  const questionSelect = document.getElementById("question-select");
  const qaGroundTruth = document.getElementById("qa-ground-truth");
  const qaModelAnswer = document.getElementById("qa-model-answer");
  const qaVerdict = document.getElementById("qa-verdict");

  // Populate QA Dropdown
  PIPELINE_DATA.sampleQuestions.forEach((q, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = `[${q.type.toUpperCase()}] ${q.question.substring(0, 75)}...`;
    questionSelect.appendChild(opt);
  });

  let activeQAIdx = 0;
  let currentActiveState = "baseline";

  function renderStateOverview(stateKey) {
    currentActiveState = stateKey;
    const stateData = PIPELINE_DATA.states[stateKey];

    stateBtns.forEach(btn => {
      if (btn.dataset.state === stateKey) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    hitRateEl.textContent = `${stateData.metrics.hitRate.toFixed(1)}%`;
    tokenF1El.textContent = `${stateData.metrics.tokenF1.toFixed(1)}%`;
    judgeScoreEl.textContent = `${stateData.metrics.judgeScore.toFixed(2)}`;
    totalDocsEl.textContent = stateData.metrics.totalDocs;

    if (stateData.metrics.hitRate >= 90) {
      hitRateEl.style.color = "var(--accent-emerald)";
      tokenF1El.style.color = "var(--accent-emerald)";
    } else {
      hitRateEl.style.color = "var(--accent-rose)";
      tokenF1El.style.color = "var(--accent-rose)";
    }

    gateStatusBadge.textContent = stateData.statusBadge;
    gateStatusBadge.className = `badge ${stateData.qualityGate.success ? "status-pass" : "status-fail"}`;

    gateListEl.innerHTML = "";
    stateData.qualityGate.checks.forEach(check => {
      const item = document.createElement("div");
      item.className = "gate-item";
      item.innerHTML = `
        <div class="gate-info">
          <h4>${check.name}</h4>
          <p>${check.detail}</p>
        </div>
        <span class="gate-status ${check.success ? "status-pass" : "status-fail"}">
          ${check.success ? "PASSED" : "FAILED"}
        </span>
      `;
      gateListEl.appendChild(item);
    });

    if (stateData.qualityGate.violations.length > 0) {
      violationsPanel.style.display = "block";
      violationsList.innerHTML = "";
      stateData.qualityGate.violations.forEach(v => {
        const li = document.createElement("li");
        li.textContent = v;
        li.style.color = "var(--accent-rose)";
        li.style.marginBottom = "0.25rem";
        li.style.fontSize = "0.8125rem";
        violationsList.appendChild(li);
      });
    } else {
      violationsPanel.style.display = "none";
    }

    const staleRate = stateData.metrics.staleRate;
    freshnessStatusEl.innerHTML = `Stale rate: <strong>${staleRate}%</strong> (Ngưỡng an toàn: &le; 25%) — <span style="color: ${staleRate <= 25 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}; font-weight: 700;">${staleRate <= 25 ? 'FRESH (SLA Passed)' : 'STALE (Violation)'}</span>`;
    freshnessBarEl.style.width = `${Math.min(100, staleRate * 3.5)}%`;
    freshnessBarEl.style.backgroundColor = staleRate <= 25 ? "var(--accent-emerald)" : "var(--accent-rose)";

    renderQAPanel();
  }

  function renderQAPanel() {
    const q = PIPELINE_DATA.sampleQuestions[activeQAIdx];
    qaGroundTruth.textContent = q.groundTruth;

    if (currentActiveState === "baseline") {
      qaModelAnswer.textContent = q.baselineAnswer;
      qaVerdict.innerHTML = `<span class="badge status-pass">HIT & PASS</span> Score: 5.0 / 5.0 — Trả lời hoàn hảo từ ngữ cảnh sạch.`;
    } else if (currentActiveState === "corrupted") {
      qaModelAnswer.innerHTML = q.corruptedAnswer.replace(/### \[GARBAGE_NOISE_\$\$\$\] ###/g, '<span class="qa-highlight">### [GARBAGE_NOISE_$$$] ###</span>');
      qaVerdict.innerHTML = `<span class="badge status-fail">SILENT FAILURE</span> ${q.corruptedJudge}`;
    } else {
      qaModelAnswer.textContent = q.repairedAnswer;
      qaVerdict.innerHTML = `<span class="badge status-pass">RECOVERED</span> Score: 5.0 / 5.0 — 100% phục hồi sau khi chạy Idempotent Repair.`;
    }
  }

  stateBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      renderStateOverview(btn.dataset.state);
    });
  });

  questionSelect.addEventListener("change", (e) => {
    activeQAIdx = parseInt(e.target.value, 10);
    renderQAPanel();
  });

  renderStateOverview("baseline");
});
