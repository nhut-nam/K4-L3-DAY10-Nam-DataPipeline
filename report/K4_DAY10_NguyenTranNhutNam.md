# Member Role Report — Day 10: Data Pipeline & Data Observability

## 1. Thông tin cá nhân

| Thông tin         | Nội dung                  |
| ------------------ | -------------------------- |
| Họ và tên       | Nguyễn Trần Nhựt Nam       |
| MSSV               | K4-DAY10                  |
| Khóa/Lớp         | K4-L3-DAY10               |
| Tên nhóm         | Nam                       |
| Vai trò chính    | Toàn bộ Pipeline End-to-End |
| Repository         | https://github.com/nhut-nam/K4-L3-DAY10-Nam-DataPipeline.git |
| Ngày hoàn thành | 2026-09-25                |

---

## 2. Vai trò và phạm vi công việc

### Phần việc sở hữu

| Module/deliverable | File/hàm phụ trách | Input nhận vào | Output bàn giao  | Trạng thái |
| ------------------ | --------------------- | ---------------- | ----------------- | :---: |
| Ingestion & Lineage | `src/ingestion/crossref.py` | Crossref API / raw JSON snapshot | `data/raw/crossref_records.json` | Hoàn thành |
| Data Cleaning | `src/ingestion/cleaning.py` | List `PaperRecord`, `run_date` | `data/clean/papers_clean.csv`, `.json` | Hoàn thành |
| Observability (GX 1.x) | `src/observability/quality.py` | Cleaned / Corrupted DataFrame | `data/quality/*_quality_report.json` | Hoàn thành |
| Freshness SLA | `src/observability/quality.py` | Cleaned DataFrame, Settings | `data/quality/freshness_report.json` | Hoàn thành |
| Evaluation Test Set | `src/evaluation/testset.py` | Cleaned DataFrame | `data/eval/test_set.json` (10 câu hỏi) | Hoàn thành |
| Corruption Suite | `src/ingestion/corruption.py` | Cleaned DataFrame | `data/results/corruption_log.json` | Hoàn thành |
| Idempotent Repair | `src/pipelines/corruption_flow.py` | Raw Records | `data/clean/papers_clean_repaired.csv` | Hoàn thành |
| End-to-End Pipelines | `src/pipelines/phase1.py`, `corruption_flow.py` | Toàn bộ các module | Báo cáo Markdown & Metrics JSON | Hoàn thành |

---

## 3. Kết quả theo vai trò

| Nhiệm vụ đã thực hiện | File/hàm/artifact liên quan | Kết quả bàn giao       | Cách xác minh         |
| --------------------------- | ----------------------------- | ------------------------- | ----------------------- |
| Bóc tách XML và làm sạch dữ liệu | `src/ingestion/cleaning.py` | 24 dòng dữ liệu chuẩn hóa, có `text_for_embedding` | `data/clean/papers_clean.csv` |
| Thiết lập chốt kiểm dịch Great Expectations 1.x | `src/observability/quality.py` | 4 Expectations bắt buộc đạt Pass trên data sạch | `data/quality/baseline_quality_report.json` |
| Đo lường hiệu năng Baseline | `src/pipelines/phase1.py` | Hit Rate: 100%, Token F1: 100% | `data/results/baseline_metrics.json` |
| Tiêm 6 dạng độc tố dữ liệu | `src/ingestion/corruption.py` | Log 6 dạng lỗi, Hit Rate giảm còn 60% | `data/results/corruption_log.json`, `corrupted_metrics.json` |
| Tự phục hồi dữ liệu Idempotent | `src/pipelines/corruption_flow.py` | Phục hồi 100% phong độ ban đầu | `data/results/repaired_metrics.json`, `corruption_report.md` |

---

## 4. Giải thích phần kỹ thuật đã thực hiện

### Vấn đề cần giải quyết
Xây dựng Data Pipeline vững chắc cho hệ thống RAG Agent, ngăn chặn hiện tượng **Silent Failure** (AI không báo lỗi nhưng trả lời sai do dữ liệu bẩn) bằng chốt kiểm dịch **Great Expectations 1.x** và cơ chế **Idempotent Self-Healing Repair**.

### Cách triển khai
1. **Sanitization:** Dùng regex `re.sub(r"<[^>]+>", " ", text)` bóc thẻ XML/HTML, unescape entity, chuẩn hóa khoảng trắng.
2. **Quality Gate:** Dựng Ephemeral Context của GX 1.x (`context.data_sources.add_pandas`), kiểm tra 4 hàng rào: số dòng `[5, 5000]`, not null, unique `paper_id`, độ dài `summary >= 30` & `title >= 8`.
3. **Freshness SLA:** Đo `age_days` so với ngưỡng 180 ngày; cảnh báo vi phạm nếu tỷ lệ bài cũ > 25%.
4. **Idempotence:** Khi bị lỗi, không sửa tay mà đọc lại từ bản lưu thô nguyên bản `data/raw/crossref_records.json` để tái tạo lại trạng thái sạch.

---

## 5. Một quyết định kỹ thuật quan trọng

- **Bối cảnh:** Lựa chọn phương pháp xử lý khi API bên ngoài bị nghẽn mạng hoặc trả về `429 Too Many Requests`.
- **Phương án cân nhắc:**
  1. Dừng chương trình (`raise Exception`) và yêu cầu người dùng thử lại sau.
  2. Xây dựng cơ chế Fallback tự động: nếu API gặp sự cố, tự động chuyển sang đọc snapshot offline có sẵn tại `data/raw/crossref_response.json`.
- **Lựa chọn:** Phương án 2 (Offline Fallback Mechanism).
- **Lý do:** Đảm bảo hệ thống đạt tính khả dụng cao (High Availability), việc kiểm thử và chạy lab không bị gián đoạn bởi các yếu tố ngoại cảnh ngoài tầm kiểm soát.

---

## 6. Một lỗi hoặc blocker đã xử lý

- **Triệu chứng:** `FileNotFoundError: File ... data\clean\papers_clean.json does not exist` khi chạy lệnh kiểm thử `run_data_quality_checks`.
- **Nguyên nhân gốc:** Ở các bước kiểm thử unit test ban đầu, dữ liệu sạch mới chỉ tồn tại trên RAM mà chưa được ghi ra đĩa.
- **Cách xử lý:** Cập nhật pipeline đảm bảo hàm `write_json` và `write_csv` xuất file ngay sau khi `build_clean_dataframe()` hoàn tất.
- **Bài học kỹ thuật:** Trong Data Pipeline, tính toàn vẹn của artifacts lưu trữ trung gian giữa các tầng (Bronze $\to$ Silver $\to$ Gold) là tối quan trọng để các chốt kiểm dịch hoạt động độc lập và tin cậy.

---

## 7. Hiểu biết về luồng end-to-end

1. Dữ liệu thô từ Crossref API được lưu trữ nguyên vẹn để bảo toàn Data Lineage.
2. Quá trình Cleaning biến đổi dữ liệu thành dạng chuẩn hóa cho Embedding Model (`all-MiniLM-L6-v2`).
3. Chốt chặn Observability (GX 1.x + Freshness) ngăn chặn dữ liệu hỏng lọt vào ChromaDB.
4. Khi dữ liệu bị tiêm lỗi, điểm số RAG lập tức sụt giảm nghiêm trọng chứng minh Silent Failure.
5. Cơ chế Idempotent Repair tái tạo lại dữ liệu sạch từ Raw, giúp AI lấy lại 100% phong độ mà không cần can thiệp thủ công.
