# Group Report — Day 10: Data Pipeline & Data Observability

## 1. Thông tin bài nộp

| Thông tin         | Nội dung                  |
| ------------------ | -------------------------- |
| Khóa/Lớp         | K4-L3-DAY10               |
| Tên nhóm         | Nam                       |
| Repository         | https://github.com/nhut-nam/K4-L3-DAY10-Nam-DataPipeline.git |
| Ngày hoàn thành | 2026-09-25                |

### Thành viên và phân công

| STT | Họ và tên | MSSV | Vai trò chính | Module/deliverable sở hữu |
| --: | --- | --- | --- | --- |
| 1 | Nguyễn Trần Nhựt Nam | K4-DAY10 | Toàn bộ Pipeline | `src/` (toàn bộ 6 module), `data/` artifacts, `reports/` |

---

## 2. Tóm tắt kết quả

Nhóm (thực hiện solo bởi Nguyễn Trần Nhựt Nam) đã hoàn thành 100% các mục tiêu từ Checkpoint 0 đến Checkpoint 6 của bài Lab Day 10. Hệ thống Data Pipeline cho dữ liệu nghiên cứu học thuật từ Crossref REST API được xây dựng hoàn chỉnh với cơ chế Lineage bảo toàn nguồn gốc tại `data/raw/`. 

Ở Pha Baseline, pipeline tiền xử lý thành công 24 bài báo, vượt qua chốt kiểm dịch Great Expectations 1.x (4 Expectations) và Freshness SLA (độ tươi đạt 95.8%), sau đó nhúng vector với `all-MiniLM-L6-v2` vào ChromaDB để đạt chỉ số hoàn hảo: **Hit Rate 100%**, **Token F1 100%**, **Judge Accuracy 100%**. 

Tại Pha Corruption, hệ thống đã mô phỏng thành công 6 dạng lỗi thực tế: bỏ rơi 20% bài mới, xóa tóm tắt, chèn ký tự nhiễu, cắt ngắn tiêu đề < 8 ký tự, làm cũ ngày tháng về quá khứ 365 ngày và nhân đôi bản ghi. Các lỗi này lập tức kích hoạt chuông cảnh báo từ Quality Gate GX 1.x và khiến chất lượng của RAG Agent sụt giảm nghiêm trọng (**Hit Rate tụt xuống 60%**, **Token F1 giảm còn 66.9%**), minh chứng rõ rệt cho hiện tượng **Silent Failure**. 

Cuối cùng, cơ chế **Idempotent Repair** đã tự động khôi phục dữ liệu sạch nguyên bản từ nguồn Raw Lineage, đưa toàn bộ chỉ số Retrieval và QA phục hồi 100% phong độ ban đầu, chứng minh tính toàn vẹn và năng lực tự chữa lành của hệ thống dữ liệu.

---

## 3. Kiến trúc và luồng dữ liệu

### Luồng end-to-end

```text
Crossref API (hoặc Snapshot Offline data/raw/crossref_response.json)
    │
    ├── 1. Ingestion & Raw Lineage Preservation -> data/raw/crossref_records.json
    ├── 2. Sanitization, Feature Engineering    -> data/clean/papers_clean.csv (.json)
    ├── 3. Data Quality Gate (GX 1.x) & Freshness SLA -> data/quality/
    ├── 4. MiniLM Embeddings & ChromaDB Index   -> data/chroma/ (papers-baseline)
    ├── 5. Evaluation Benchmarking (10 Qs)      -> data/results/baseline_metrics.json
    ├── 6. Synthetic Data Corruption (6 Flaws)  -> data/results/corruption_log.json
    ├── 7. Performance Degradation Analysis     -> data/results/corrupted_metrics.json
    └── 8. Idempotent Repair & 3-State Compare  -> data/reports/corruption_report.md
```

### Trách nhiệm của từng khối

| Khối             | Input          | Xử lý chính             | Output/artifact          | Owner          |
| ----------------- | -------------- | -------------------------- | ------------------------ | -------------- |
| Ingestion         | Crossref REST API / Snapshot raw JSON | Fetch có retry, fallback offline, bóc tách `items` thành `PaperRecord` | `data/raw/crossref_response.json`, `crossref_records.json` | Nguyễn Nhựt Nam |
| Cleaning          | `PaperRecord` list | Bóc thẻ HTML/XML, unescape, chuẩn hóa khoảng trắng, tính `age_days`, tạo `text_for_embedding`, khử trùng | `data/clean/papers_clean.csv`, `papers_clean.json` | Nguyễn Nhựt Nam |
| Embedding/index   | Cleaned DataFrame | Mô hình `sentence-transformers/all-MiniLM-L6-v2`, Cosine similarity, ChromaDB PersistentClient | `data/chroma/`, `data/embeddings/papers_embeddings.json` | Nguyễn Nhựt Nam |
| Evaluation        | Cleaned DataFrame / Test set | Sinh bộ 10 câu hỏi đa dạng 4 nhóm (`summary`, `authors`, `date`, `categories`), đo Token F1 & Hit Rate | `data/eval/test_set.json`, `baseline_metrics.json` | Nguyễn Nhựt Nam |
| Observability     | Cleaned / Corrupted DataFrame | Great Expectations 1.x Ephemeral mode (4 expectations) & Freshness SLA (`age_days > 180`) | `data/quality/*_quality_report.json`, `freshness_report.json` | Nguyễn Nhựt Nam |
| Corruption/repair | Cleaned DataFrame, Raw Records | Tiêm 6 dạng độc tố dữ liệu; Kích hoạt Idempotent Repair tái tạo từ raw records | `corruption_log.json`, `repaired_clean.csv`, `repaired_metrics.json` | Nguyễn Nhựt Nam |
| Orchestration     | Settings, Modules | Điều phối luồng Phase 1 và Corruption Flow, xuất Markdown comparison | `phase1_report.md`, `corruption_report.md` | Nguyễn Nhựt Nam |

---

## 4. Cách tái hiện kết quả

### Cấu hình không chứa secret

| Biến/cấu hình             | Giá trị sử dụng |
| ---------------------------- | ------------------- |
| `LLM_PROVIDER`             | `openai` (hỗ trợ `mock` khi không có API key) |
| `LLM_MODEL`                | `gpt-4o-mini` |
| Embedding model              | `sentence-transformers/all-MiniLM-L6-v2` |
| Số lượng Crossref records | 24 records |
| Retrieval `top_k`           | 4 |
| Freshness threshold          | 180 ngày (Cảnh báo khi tỷ lệ > 25%) |
| Random seed, nếu có        | Deterministic selection / fixed order |

### Lệnh cài đặt

```bash
uv sync
```

Hoặc qua pip:

```bash
python -m pip install -e .
```

### Lệnh chạy

Chạy toàn tuyến Pha 1 (Baseline):
```bash
python script/run_phase1.py
```

Chạy toàn tuyến Pha 2 (Corruption, Repair & 3-State Compare):
```bash
python script/run_corruption_flow.py
```

### Kết quả tái hiện

| Lệnh             | Trạng thái                                    | Thời điểm chạy gần nhất | Bằng chứng                         |
| ----------------- | ----------------------------------------------- | ----------------------------- | ------------------------------------ |
| Baseline pipeline | Thành công 100% | 2026-09-25 14:50 | `data/results/baseline_metrics.json`, `data/reports/phase1_report.md` |
| Corruption flow   | Thành công 100% | 2026-09-25 14:55 | `data/results/corruption_log.json`, `data/reports/corruption_report.md` |

---

## 5. Ingestion, cleaning và data contract

### Nguồn dữ liệu

| Thuộc tính                | Giá trị                             |
| --------------------------- | ------------------------------------- |
| Source                      | Crossref REST API (`https://api.crossref.org/works`) |
| Query/filter                | `query=agentic retrieval augmented generation large language model`, `filter=from-pub-date:...,has-abstract:true` |
| Thời điểm lấy dữ liệu | 2026-09-25T14:40:00Z |
| Số record nhận được    | 24 records |
| Cơ chế retry/backoff      | Timeout 10s, bắt lỗi HTTP 429/503/mạng tự động fallback đọc snapshot offline `data/raw/crossref_response.json` |

### Raw và clean schema

| Trường        | Kiểu dữ liệu | Bắt buộc?  | Ý nghĩa   | Xử lý khi thiếu/sai |
| --------------- | --------------- | ------------ | ----------- | ---------------------- |
| `paper_id` | `str` | Có | Mã DOI định danh duy nhất của bài báo | Bỏ qua record nếu thiếu |
| `title` | `str` | Có | Tiêu đề bài báo | Bỏ qua record nếu thiếu, bóc thẻ XML |
| `summary` | `str` | Có | Tóm tắt nội dung bài báo | Bóc sạch thẻ JATS XML `<jats:p>`, unescape HTML entities |
| `authors` / `authors_joined` | `list[str]` / `str` | Có | Danh sách tác giả | Ghép họ tên, nối chuỗi bằng dấu phẩy |
| `categories` / `categories_joined` | `list[str]` / `str` | Có | Lĩnh vực chuyên ngành | Nối chuỗi bằng dấu phẩy |
| `published` | `str` (YYYY-MM-DD) | Có | Ngày xuất bản | Parse từ `date-parts`, chuẩn hóa YYYY-MM-DD |
| `age_days` | `int` | Có | Tuổi đời bài báo tính theo ngày | `(run_date - published).days` |
| `text_for_embedding` | `str` | Có | Ngữ cảnh toàn diện đưa vào mô hình nhúng | Ghép khuôn 5 phần tiêu chuẩn |

### Quy tắc cleaning

| Quy tắc                                 | Quality dimension liên quan | Số record bị tác động | Cách xác minh      |
| ---------------------------------------- | ---------------------------- | -------------------------: | -------------------- |
| Bóc thẻ JATS XML/HTML và giải mã entities | Validity / Uniqueness | 24 | Hàm `_clean_str()` bằng regex và `html.unescape()` |
| Khử trùng lặp theo `paper_id` | Uniqueness | 0 (dữ liệu sạch) / 2 (khi bị corrupt) | `ExpectColumnValuesToBeUnique(paper_id)` |
| Tính toán `age_days` và gán nhãn độ tươi | Currency / Timeliness | 24 | `freshness_report.json` |
| Tạo khuôn `text_for_embedding` 5 phần | Completeness | 24 | `ExpectColumnValuesToNotBeNull(text_for_embedding)` |

---

## 6. Evaluation setup

| Thành phần                             | Cấu hình thực tế          |
| ---------------------------------------- | ----------------------------- |
| Số câu hỏi                            | 10 câu hỏi chuẩn hóa |
| Các `question_type`                    | `summary` (3 câu), `authors` (3 câu), `date` (2 câu), `categories` (2 câu) |
| Ground-truth document ID                 | `paper_id` tương ứng với bài báo chứa câu trả lời |
| Embedding model                          | `sentence-transformers/all-MiniLM-L6-v2` |
| Vector store/collection                  | ChromaDB: `papers-baseline`, `papers-corrupted`, `papers-repaired` |
| Retrieval `top_k`                       | 4 |
| LLM provider/model                       | `gemini` / `gemini-2.5-flash` |
| Test set dùng chung cho ba trạng thái | `data/eval/test_set.json` |

**Giải thích vì sao test set được giữ nguyên khi đánh giá baseline, corrupted và repaired:**
Để phép đo lường hiệu năng và mức độ suy giảm có tính khoa học và giá trị đối chiếu khách quan (Controlled Experiment), chúng ta phải giữ cố định biến độc lập đánh giá là tập câu hỏi kiểm thử. Khi tập câu hỏi và Ground Truth được giữ bất biến qua cả 3 trạng thái, mọi sự trồi sụt của chỉ số (Hit Rate, Token F1) hoàn toàn là hệ quả trực tiếp từ chất lượng của dữ liệu bên trong Vector Store.

---

## 7. Kết quả baseline

### Artifact checklist

| Artifact                 | Đường dẫn thực tế                | Trạng thái | Ghi chú   |
| ------------------------ | -------------------------------------- | ------------ | ---------- |
| Raw response/records     | `data/raw/crossref_records.json` | Có | Đầy đủ 24 bản ghi gốc |
| Cleaned dataset          | `data/clean/papers_clean.csv` | Có | 24 dòng sạch hoàn chỉnh |
| Embedding manifest/index | `data/embeddings/papers_embeddings.json` | Có | Index collection `papers-baseline` |
| Evaluation set           | `data/eval/test_set.json` | Có | 10 câu hỏi thuộc 4 dạng |
| Baseline metrics         | `data/results/baseline_metrics.json` | Có | Đo lường hoàn tất |
| Quality/freshness        | `data/quality/baseline_quality_report.json` | Có | GX 1.x validation đạt `success=True` |
| Baseline report          | `data/reports/phase1_report.md` | Có | Báo cáo Markdown chi tiết |

### Baseline metrics

| Metric                 |       Giá trị | Diễn giải                             |
| ---------------------- | --------------: | --------------------------------------- |
| `retrieval_hit_rate` | 100.0% | Toàn bộ 10/10 câu hỏi đều truy xuất trúng tài liệu chứa đáp án trong top 4 |
| `mean_token_f1`      | 100.0% | Câu trả lời trích xuất khớp chính xác tuyệt đối với Ground Truth |
| `judge_accuracy`     | 100.0% | Đánh giá độc lập xác nhận câu trả lời đúng bản chất |
| `mean_judge_score`   | 5.0 / 5.0 | Điểm đánh giá chất lượng tối đa |

---

## 8. Data quality và freshness

### Quality checks

| Check        | Quality dimension | Ngưỡng/kỳ vọng | Kết quả baseline      | Bằng chứng |
| ------------ | ----------------- | ------------------ | ----------------------- | ------------ |
| `ExpectTableRowCountToBeBetween` | Completeness | [5, 5000] | Pass (24 dòng) | `baseline_quality_report.json` |
| `ExpectColumnValuesToNotBeNull` | Completeness | Không null ở `paper_id`, `title`, `text_for_embedding` | Pass (100% hợp lệ) | `baseline_quality_report.json` |
| `ExpectColumnValuesToBeUnique` | Uniqueness | `paper_id` là duy nhất | Pass (Không trùng) | `baseline_quality_report.json` |
| `ExpectColumnValueLengthsToBeBetween` | Validity | `summary` >= 30 chars, `title` >= 8 chars | Pass (Độ dài chuẩn) | `baseline_quality_report.json` |

### Freshness

| Thuộc tính               | Giá trị                           |
| -------------------------- | ----------------------------------- |
| Freshness được đo tại | Cleaned DataFrame (`age_days`) |
| Timestamp mới nhất       | 2026-07-22 |
| Timestamp cũ nhất        | 2026-03-28 |
| Ngưỡng freshness         | 180 ngày (SLA vi phạm nếu stale > 25%) |
| Trạng thái baseline      | **FRESH (Hợp lệ)** |
| Lý do                     | Chỉ có 1/24 bài báo có `age_days > 180` (tỷ lệ 4.2% << ngưỡng 25%) |

---

## 9. Corruption scenarios và repair

| Corruption         | Cách tạo | Record bị tác động | Quality signal kỳ vọng | Tác động thực tế | Cách repair   |
| ------------------ | ---------- | ---------------------: | ------------------------ | --------------------- | -------------- |
| Drop latest records | Bỏ 20% bài báo mới nhất | 4 bài | Cảnh báo thiếu bản ghi | Hit rate giảm mạnh đối với các câu hỏi về bài mới | Tải lại bản gốc từ Raw records |
| Blank summary | Xóa trắng summary | 1 bài | GX `ExpectColumnValueLengthsToBeBetween` báo Fail | RAG trả về rỗng hoặc câu trả lời không liên quan | Khôi phục nội dung tóm tắt từ Raw |
| Inject noise | Chèn chuỗi ký tự rác vào summary | 1 bài | Vector embedding bị lệch hướng trong không gian ngữ nghĩa | Token F1 sụt giảm | Thay thế bằng chuỗi tóm tắt nguyên bản |
| Truncate title | Cắt ngắn tiêu đề thành "AI" (< 8 ký tự) | 1 bài | GX `ExpectColumnValueLengthsToBeBetween(title)` báo Fail | Truy vấn theo tên bài báo bị thất bại | Khôi phục tiêu đề đầy đủ từ Raw |
| Stale date | Lùi ngày xuất bản về quá khứ 365 ngày | 2 bài | Freshness SLA cảnh báo dữ liệu cũ | Tăng tỷ lệ stale data | Cập nhật lại ngày xuất bản chuẩn |
| Duplicate rows | Nhân bản 2 dòng bất kỳ | 2 dòng | GX `ExpectColumnValuesToBeUnique(paper_id)` báo Fail | Loãng xếp hạng tìm kiếm của ChromaDB | Khử trùng lặp tự động bằng `drop_duplicates` |

### Corruption log:
- **Đường dẫn:** `data/results/corruption_log.json`
- **Trạng thái:** Đầy đủ, ghi nhận chi tiết 6 dạng lỗi và danh sách `paper_id` bị tác động.

**Giải thích cách repair đảm bảo dữ liệu được phục hồi từ nguồn đáng tin cậy:**
Cơ chế Repair đọc lại trực tiếp từ nguồn lưu trữ nguyên thủy `data/raw/crossref_records.json` (Lineage Raw Archive) vốn không bị chỉnh sửa. Dữ liệu sau đó được tái thực thi toàn bộ chu trình chuẩn hóa và khử trùng lặp qua hàm `build_clean_dataframe()`, đảm bảo tính **Idempotent** (chạy lại bao nhiêu lần kết quả vẫn đồng nhất và sạch 100%).

---

## 10. So sánh baseline, corrupted và repaired

| Metric/signal            | Baseline | Corrupted | Repaired | Thay đổi do corruption | Mức phục hồi | Nhận xét   |
| ------------------------ | -------: | --------: | -------: | -----------------------: | --------------: | ------------ |
| `retrieval_hit_rate`   |   100.0% |    60.0% |   100.0% |                   -40.0% |          +40.0% | Dữ liệu lỗi làm mất bài dẫn đến sụt giảm nghiêm trọng |
| `mean_token_f1`        |   100.0% |    66.9% |   100.0% |                   -33.1% |          +33.1% | Tóm tắt bị xóa và dính rác làm câu trả lời sai lệch |
| `judge_accuracy`       |   100.0% |    60.0% |   100.0% |                   -40.0% |          +40.0% | Silent Failure xuất hiện rõ ràng |
| `mean_judge_score`     |     5.00 |     3.80 |     5.00 |                    -1.20 |           +1.20 | Điểm số phục hồi trọn vẹn |
| Quality checks pass/fail |   PASSED |   FAILED |   PASSED |               Vi phạm GX |        Khôi phục | GX phát hiện lỗi trùng lặp và độ dài title/summary |
| Freshness status         |    FRESH |    FRESH |    FRESH |              Tăng độ tuổi |        Khôi phục | Độ tươi duy trì trong ngưỡng SLA an toàn |

### Hai kết luận nhân quả hỗ trợ bởi artifacts:
1. **Lỗi dữ liệu $\to$ Suy giảm RAG (Silent Failure):** Việc xóa rỗng tóm tắt và drop 20% bài báo mới đã trực tiếp làm sụt giảm `retrieval_hit_rate` từ 100% xuống 60% và `mean_token_f1` từ 100% xuống 66.9%. Hệ thống không báo lỗi runtime mà âm thầm trả về câu trả lời sai lệch.
2. **Idempotent Repair $\to$ Phục hồi 100%:** Việc chạy lại chu trình làm sạch từ `data/raw/crossref_records.json` đã đưa `retrieval_hit_rate` và `mean_token_f1` trở lại chính xác 100%, đồng thời khôi phục trạng thái Quality Gate về `PASSED`.

---

## 11. Vấn đề tích hợp quan trọng

- **Triệu chứng:** Khi chạy kiểm thử ban đầu, lệnh kiểm tra chất lượng báo lỗi `FileNotFoundError` do `papers_clean.json` chưa được lưu xuống đĩa. Đồng thời, phiên bản Great Expectations 1.x không còn hỗ trợ cú pháp cũ `context.sources.pandas_default`.
- **Nguyên nhân:** Các hàm kiểm thử unit test chạy độc lập trên RAM trước khi pipeline chính xuất file. Cú pháp GX cũ bị deprecated trên phiên bản GX 1.x.
- **Cách xử lý:** Cập nhật pipeline đảm bảo lưu đồng thời cả 2 file `papers_clean.csv` và `papers_clean.json` ngay sau khi clean; Chuyển toàn bộ cú pháp sang chuẩn mới của GX 1.x:
  `context = gx.get_context(mode="ephemeral")`
  `data_source = context.data_sources.add_pandas(...)`
  `batch_def = data_asset.add_batch_definition_whole_dataframe(...)`
- **Cách xác minh:** Chạy `python script/run_phase1.py` và `python script/run_corruption_flow.py` trơn tru không phát sinh cảnh báo hay lỗi.

---

## 12. Giới hạn và hướng cải thiện

| Giới hạn hiện tại | Ảnh hưởng   | Hướng cải thiện có thể kiểm chứng |
| --------------------- | -------------- | ----------------------------------------- |
| Khử trùng lặp dựa trên khóa tuyệt đối `paper_id` | Chưa phát hiện được các bài viết bị sao chép nhưng đổi tiêu đề | Bổ sung thuật ngữ MinHash LSH hoặc Fuzzy Matching ngữ nghĩa |
| Giám sát độ tươi dựa trên ngày xuất bản tĩnh | Không phát hiện được các bản cập nhật chỉnh sửa nội dung | Bổ sung trường `updated` và kiểm tra checksum/hash của nội dung |
| Dữ liệu mẫu 24 bản ghi chạy trên bộ nhớ cục bộ | Chưa phản ánh áp lực quy mô lớn (hàng triệu bản ghi) | Tích hợp DuckDB hoặc Polars và triển khai Data Quality trên luồng phân tán |

---

## 13. Checklist trước khi nộp

- [x] Thông tin nhóm và repository chính xác (`Nam` / `K4-L3-DAY10-Nam-DataPipeline`).
- [x] Phân công khớp với module, artifact và kết quả thực tế.
- [x] Lệnh tái hiện đã được chạy lại trên phiên bản dùng để nộp.
- [x] Baseline, corrupted và repaired dùng cùng evaluation set (`test_set.json`).
- [x] Bảng metrics khớp với các file trong `data/results/`.
- [x] Quality/freshness conclusions khớp với `data/quality/`.
- [x] Các đường dẫn báo cáo và artifact truy cập được.
- [x] Mỗi thành viên đã hoàn thành báo cáo vai trò riêng (`report/individual_report.md`).
- [x] Không có `.env`, API key, token hoặc secret trong source, report, log hay ảnh.
