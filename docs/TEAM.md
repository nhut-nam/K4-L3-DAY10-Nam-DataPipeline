# Danh Sách Thành Viên & Báo Cáo Phân Công Nhóm

- **Tên Nhóm:** `Nam`
- **Mã Nhóm / Lớp:** `H205`
- **Tên Repository Nộp Bài:** `K4-L3-DAY10-Nam-DataPipeline`
- **Hình thức thực hiện:** Đảm nhiệm toàn bộ quy trình End-to-End

---

## 👥 Danh sách thành viên

| STT | Họ và tên | MSSV | Email | Vai trò & Phân công công việc | Báo cáo cá nhân |
|---:|---|---|---|---|---|
| 1 | Nguyễn Trần Nhựt Nam | K4-DAY10 | namnh@vinuni.edu.vn | Toàn quyền phụ trách Pipeline End-to-End (Ingestion, Cleaning, Quality Gate GX 1.x, ChromaDB RAG, Corruption & Repair) | `report/individual_report.md` |

---

## 📝 Báo cáo đóng góp cá nhân

### 👤 Nguyễn Trần Nhựt Nam (All Roles)
- **Vai trò:** Toàn bộ vai trò trong dự án (Pipeline Lead, Data Foundation Owner, RAG Specialist, Observability Lead).
- **Công việc chi tiết đã hoàn thành:**
  - **CP0 (Ingestion & Lineage):** Xây dựng module `src/ingestion/crossref.py` với cơ chế tải từ Crossref API và fallback tự động sang snapshot offline `data/raw/crossref_response.json`. Lưu trữ 2 file raw artifacts bảo tồn data lineage.
  - **CP1 (Cleaning & Data Observability):** Hoàn thiện `src/ingestion/cleaning.py` làm sạch XML tag, tính `age_days`, ghép `text_for_embedding`, khử trùng lặp; Thiết lập Quality Gate Great Expectations 1.x Ephemeral mode và Freshness SLA trong `src/observability/quality.py`.
  - **CP2 (Evaluation Testset & Vector Store):** Xây dựng bộ test benchmark 10 câu hỏi chia 4 nhóm nghiệp vụ trong `src/evaluation/testset.py`; Khởi tạo ChromaDB collection `papers-baseline` với `all-MiniLM-L6-v2`.
  - **CP3 (Baseline Pipeline):** Điều phối luồng chạy toàn tuyến Pha 1 trong `src/pipelines/phase1.py` và xuất báo cáo `data/reports/phase1_report.md`.
  - **CP4 (Data Corruption Suite):** Triển khai 6 kịch bản làm bẩn dữ liệu thực tế trong `src/ingestion/corruption.py`, ghi log và chứng minh hiện tượng Silent Failure làm giảm sút chỉ số RAG xuống còn 60%.
  - **CP5 (Idempotent Repair & Comparison):** Xây dựng cơ chế tự phục hồi Idempotent Repair trong `src/pipelines/corruption_flow.py`, tái tạo dữ liệu sạch từ bản lưu thô và xuất báo cáo đối chiếu 3 trạng thái tại `data/reports/corruption_report.md`.
- **Điều học được / Đóng góp chính:**
  - Hiểu sâu sắc bản chất của hiện tượng **Silent Failure** trong các hệ thống RAG thực tế.
  - Nắm vững kiến trúc chốt kiểm dịch dữ liệu bằng **Great Expectations 1.x** và kỹ thuật thiết kế **Idempotent Self-Healing Pipeline** đảm bảo hệ thống luôn tự phục hồi toàn vẹn từ nguồn dữ liệu thô.

