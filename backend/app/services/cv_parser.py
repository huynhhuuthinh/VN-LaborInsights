"""
Module Bóc tách Văn bản Đa định dạng từ File CV (.pdf, .docx, .txt, .md)
và Phân tích Cấu trúc Hồ sơ theo Quy trình Tuyển dụng Chuyên nghiệp (ATS & HR).
"""
import io
import re
import zlib
import zipfile
import xml.etree.ElementTree as ET
from typing import Dict, Any, List


def _decode_pdf_octal_and_escapes(raw_lit: str) -> str:
    """Giải mã chuỗi literal trong PDF bao gồm mã bát phân \\ddd sang tiếng Việt CP1258/CP1252."""
    out_bytes = bytearray()
    i = 0
    n = len(raw_lit)
    while i < n:
        ch = raw_lit[i]
        if ch == "\\" and i + 1 < n:
            nxt = raw_lit[i + 1]
            if nxt in "01234567":
                oct_digits = nxt
                j = i + 2
                while j < n and len(oct_digits) < 3 and raw_lit[j] in "01234567":
                    oct_digits += raw_lit[j]
                    j += 1
                out_bytes.append(int(oct_digits, 8) & 0xFF)
                i = j
                continue
            elif nxt == "n":
                out_bytes.append(10)
            elif nxt == "r":
                out_bytes.append(13)
            elif nxt == "t":
                out_bytes.append(9)
            else:
                out_bytes.append(ord(nxt) & 0xFF)
            i += 2
        else:
            out_bytes.append(ord(ch) & 0xFF)
            i += 1

    # Nếu là UTF-16BE BOM
    if len(out_bytes) >= 2 and out_bytes[0] == 0xFE and out_bytes[1] == 0xFF:
        try:
            return bytes(out_bytes[2:]).decode("utf-16-be", errors="ignore")
        except Exception:
            pass

    for enc in ("utf-8", "cp1258", "cp1252", "latin1"):
        try:
            return bytes(out_bytes).decode(enc)
        except Exception:
            continue
    return bytes(out_bytes).decode("latin1", errors="ignore")


def _parse_pdf_tounicode_cmap(txt: str) -> Dict[int, str]:
    cmap: Dict[int, str] = {}
    for block in re.findall(r"beginbfchar(.*?)endbfchar", txt, re.S):
        for src, dst in re.findall(r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", block):
            chars = "".join(
                chr(int(dst[i : i + 4], 16))
                for i in range(0, len(dst), 4)
                if len(dst[i : i + 4]) == 4
            )
            if chars:
                cmap[int(src, 16)] = chars
    for block in re.findall(r"beginbfrange(.*?)endbfrange", txt, re.S):
        for s_hex, e_hex, d_hex in re.findall(
            r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", block
        ):
            s_val, e_val, d_val = int(s_hex, 16), int(e_hex, 16), int(d_hex, 16)
            for idx, code in enumerate(range(s_val, min(e_val + 1, s_val + 512))):
                cmap[code] = chr(d_val + idx)
    return cmap


def extract_text_from_pdf_bytes(file_bytes: bytes) -> str:
    """
    Trích xuất văn bản tiếng Việt từ file PDF nhị phân (hỗ trợ cả pypdf/PyPDF2 nếu có
    và bộ giải mã luồng FlateDecode + ToUnicode CMap nội bộ không phụ thuộc thư viện ngoài).
    """
    # 1. Thử dùng thư viện pypdf / PyPDF2 / fitz nếu môi trường có cài đặt
    for lib_name in ("pypdf", "PyPDF2"):
        try:
            mod = __import__(lib_name)
            reader = mod.PdfReader(io.BytesIO(file_bytes))
            pages_txt = [page.extract_text() or "" for page in reader.pages]
            joined = "\n".join(pages_txt).strip()
            if len(joined) >= 20:
                return joined
        except Exception:
            pass

    # 2. Bộ giải mã PDF nội bộ hỗ trợ bảng mã ToUnicode CMap tiếng Việt & ghép dòng theo tọa độ Y
    objs: Dict[int, tuple] = {}
    for m in re.finditer(rb"(\d+)\s+0\s+obj\b(.*?)endobj", file_bytes, re.S):
        oid = int(m.group(1))
        body = m.group(2)
        sm = re.search(rb"stream[\r\n]+(.*?)[\r\n]+endstream", body, re.S)
        stream_bytes = None
        if sm:
            raw_stream = sm.group(1)
            try:
                stream_bytes = zlib.decompress(raw_stream)
            except Exception:
                try:
                    stream_bytes = zlib.decompress(raw_stream.strip(b"\r\n"))
                except Exception:
                    stream_bytes = raw_stream
        objs[oid] = (body.decode("latin1", errors="ignore"), stream_bytes)

    cmaps_by_obj: Dict[int, Dict[int, str]] = {}
    for oid, (hdr, sb) in objs.items():
        if sb:
            t = sb.decode("latin1", errors="ignore")
            if "begincmap" in t:
                cmaps_by_obj[oid] = _parse_pdf_tounicode_cmap(t)

    font_obj_to_cmap: Dict[int, Dict[int, str]] = {}
    for oid, (hdr, _) in objs.items():
        m = re.search(r"/ToUnicode\s+(\d+)\s+0\s+R", hdr)
        if m and int(m.group(1)) in cmaps_by_obj:
            font_obj_to_cmap[oid] = cmaps_by_obj[int(m.group(1))]

    font_alias_map: Dict[str, Dict[int, str]] = {}
    for oid, (hdr, _) in objs.items():
        for fname, fobj in re.findall(r"/([A-Za-z0-9_+-]+)\s+(\d+)\s+0\s+R", hdr):
            if int(fobj) in font_obj_to_cmap:
                font_alias_map[fname] = font_obj_to_cmap[int(fobj)]

    lines: List[str] = []
    prev_y = None
    cur_line: List[str] = []

    for oid, (hdr, sb) in sorted(objs.items()):
        if not sb:
            continue
        t = sb.decode("latin1", errors="ignore")
        if "BT" not in t or "begincmap" in t:
            continue
        for bt_block in re.findall(r"\bBT\b(.*?)\bET\b", t, re.S):
            cur_font = None
            tm_m = re.search(
                r"[\d.-]+\s+[\d.-]+\s+[\d.-]+\s+[\d.-]+\s+([\d.-]+)\s+([\d.-]+)\s+Tm",
                bt_block,
            )
            y_val = float(tm_m.group(2)) if tm_m else None
            out: List[str] = []

            def _flush_bt_chunk(chunk_list: List[str], y_coord: float | None):
                nonlocal prev_y, cur_line
                chunk_str = "".join(chunk_list)
                if not chunk_str.strip():
                    return
                if prev_y is not None and y_coord is not None and abs(y_coord - prev_y) < 3.5:
                    cur_line.append(chunk_str)
                else:
                    if cur_line:
                        joined_line = re.sub(r"[ \t]+", " ", "".join(cur_line)).strip()
                        if joined_line:
                            lines.append(joined_line)
                    cur_line = [chunk_str]
                    prev_y = y_coord

            token_pattern = (
                r"/([A-Za-z0-9_+-]+)\s+[\d.]+\s+Tf"
                r"|<([0-9A-Fa-f]+)>"
                r"|\(([^()\\]*(?:\\.[^()\\]*)*)\)"
                r"|(-\d{3,}(?:\.\d+)?)(?=\s*[\(<])"
                r"|[\d.-]+\s+([\d.-]+)\s+T[dD]\b"
                r"|\b(T\*)\b"
            )
            for tok in re.finditer(token_pattern, bt_block):
                if tok.group(1):
                    cur_font = tok.group(1)
                elif tok.group(2):
                    hx = tok.group(2)
                    cmap = font_alias_map.get(cur_font or "", {})
                    if cmap:
                        step = 4 if len(hx) % 4 == 0 else 2
                        for i in range(0, len(hx), step):
                            code = int(hx[i : i + step], 16)
                            out.append(
                                cmap.get(code, chr(code) if 32 <= code <= 126 else "")
                            )
                    else:
                        try:
                            raw_b = bytes.fromhex(hx)
                            if raw_b.startswith(b"\xfe\xff"):
                                out.append(raw_b[2:].decode("utf-16-be", errors="ignore"))
                            else:
                                out.append(raw_b.decode("utf-8", errors="ignore"))
                        except Exception:
                            pass
                elif tok.group(3):
                    out.append(_decode_pdf_octal_and_escapes(tok.group(3)))
                elif tok.group(4):
                    try:
                        kern_val = float(tok.group(4))
                        if kern_val < -100 and out and not out[-1].endswith((" ", "\n")):
                            out.append(" ")
                    except ValueError:
                        pass
                elif tok.group(5) or tok.group(6):
                    try:
                        dy = abs(float(tok.group(5))) if tok.group(5) else 10.0
                    except ValueError:
                        dy = 0.0
                    if dy >= 3.0:
                        _flush_bt_chunk(out, y_val)
                        out = []
                        if y_val is not None:
                            y_val = y_val - dy

            _flush_bt_chunk(out, y_val)

    if cur_line:
        joined_line = re.sub(r"[ \t]+", " ", "".join(cur_line)).strip()
        if joined_line:
            lines.append(joined_line)

    return "\n".join(lines).strip()


def extract_text_from_docx_bytes(file_bytes: bytes) -> str:
    """
    Trích xuất toàn bộ đoạn văn và bảng biểu từ file Microsoft Word (.docx)
    bằng chuẩn cấu trúc OpenXML (word/document.xml, header/footer, chống lặp Textbox).
    """
    paragraphs: List[str] = []

    def _collect_paragraph_runs(p_elem: ET.Element) -> str:
        runs: List[str] = []
        for child in p_elem:
            c_tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
            if c_tag == "p":
                continue
            if c_tag == "t" and child.text:
                runs.append(child.text)
            elif c_tag == "tab":
                runs.append("  ")
            elif c_tag in ("br", "cr"):
                runs.append("\n")
            else:
                runs.append(_collect_paragraph_runs(child))
        return "".join(runs)

    with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
        all_names = zf.namelist()
        xml_files: List[str] = []
        if "word/document.xml" in all_names:
            xml_files.append("word/document.xml")
        xml_files.extend(
            sorted(
                name
                for name in all_names
                if re.match(r"^word/(?:header|footer)\d*\.xml$", name)
            )
        )
        for xml_path in xml_files:
            xml_bytes = zf.read(xml_path)
            root = ET.fromstring(xml_bytes)
            for elem in root.iter():
                tag_name = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
                if tag_name == "p":
                    line_txt = _collect_paragraph_runs(elem).strip()
                    if line_txt and (not paragraphs or paragraphs[-1] != line_txt):
                        paragraphs.append(line_txt)
    return "\n".join(paragraphs).strip()


def parse_uploaded_cv_file(filename: str, file_bytes: bytes) -> Dict[str, Any]:
    """
    Tự động nhận diện định dạng file CV (.pdf, .docx, .txt, .md, .json) và trích xuất văn bản sạch.
    """
    fname = (filename or "cv.txt").strip()
    ext = fname.lower().rsplit(".", 1)[-1] if "." in fname else "txt"
    extracted_text = ""
    file_format_label = "Văn bản thuần (.txt)"

    try:
        if ext == "docx":
            file_format_label = "Microsoft Word (.docx)"
            extracted_text = extract_text_from_docx_bytes(file_bytes)
        elif ext == "pdf":
            file_format_label = "Adobe PDF (.pdf)"
            extracted_text = extract_text_from_pdf_bytes(file_bytes)
        else:
            file_format_label = f"Tệp văn bản (.{ext})"
            for enc in ("utf-8", "utf-8-sig", "utf-16", "cp1258", "latin1"):
                try:
                    extracted_text = file_bytes.decode(enc)
                    break
                except Exception:
                    continue
    except Exception as exc:
        return {
            "status": "ERROR",
            "filename": fname,
            "file_format": file_format_label,
            "extracted_text": "",
            "word_count": 0,
            "message": f"Không thể đọc nội dung tệp {fname}: {str(exc)[:120]}",
        }

    # Làm sạch khoảng trắng thừa
    cleaned_lines = [
        re.sub(r"[ \t]+", " ", line).strip()
        for line in extracted_text.splitlines()
    ]
    cleaned_text = "\n".join(line for line in cleaned_lines if line)
    word_count = len(cleaned_text.split())

    return {
        "status": "SUCCESS" if word_count >= 5 else "WARNING",
        "filename": fname,
        "file_format": file_format_label,
        "file_size_kb": round(len(file_bytes) / 1024.0, 1),
        "extracted_text": cleaned_text,
        "word_count": word_count,
        "message": (
            f"Đã đọc thành công tệp {fname} ({word_count} từ)."
            if word_count >= 5
            else f"Tệp {fname} có ít văn bản dạng chữ (có thể là ảnh scan). Vui lòng kiểm tra hoặc bổ sung nội dung."
        ),
    }


def inspect_cv_structure_and_impact(raw_text: str) -> Dict[str, Any]:
    """
    Kiểm tra cấu trúc chuyên nghiệp của CV theo tiêu chuẩn hệ thống ATS (Applicant Tracking System)
    và đánh giá mức độ minh chứng định lượng (Quantified Achievements).
    """
    text = (raw_text or "").strip()
    text_low = text.lower()
    words = text.split()
    word_count = len(words)

    # 1. Kiểm tra thông tin liên hệ
    has_email = bool(re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text))
    has_phone = bool(re.search(r"(?:\+84|0)\s*[1-9](?:[\s.-]*\d){7,9}", text))
    has_portfolio_or_git = bool(
        re.search(r"\b(github\.com|gitlab\.com|linkedin\.com|portfolio|behance\.net|kaggle\.com)\b", text_low)
    )

    # 2. Kiểm tra các phần mục chuẩn trong CV
    has_education = bool(
        re.search(
            r"\b(đại học|cao đẳng|cử nhân|kỹ sư|thạc sĩ|tốt nghiệp|chuyên ngành|khoa|gpa|university|bachelor|education)\b",
            text_low,
        )
    )
    has_experience_or_projects = bool(
        re.search(
            r"\b(kinh nghiệm|dự án|thực tập|làm việc|triển khai|xây dựng|phát triển|công ty|project|experience|intern|work)\b",
            text_low,
        )
    )
    has_cert_or_language = bool(
        re.search(
            r"\b(toeic|ielts|toefl|aws|azure|google cloud|coursera|udemy|chứng chỉ|tiếng anh|ngoại ngữ|english|jlpt|topik)\b",
            text_low,
        )
    )

    # 3. Kiểm tra Minh chứng định lượng (Quantified Impact — con số %, quy mô, thời gian, hiệu suất)
    quantified_matches = re.findall(
        r"\b\d+(?:[.,]\d+)?\s*(?:%|phần trăm|triệu|tỷ|nghìn|bản ghi|records|users|người dùng|giờ|ngày|tháng|năm|dự án|projects|ms|giây|lần|x|gpa|điểm)\b"
        r"|\b(?:toeic|ielts)\s*\d+(?:[.,]\d+)?",
        text_low,
    )
    action_verbs = re.findall(
        r"\b(xây dựng|phát triển|tối ưu|tự động hóa|triển khai|phân tích|thiết kế|quản lý|tích hợp|giảm|tăng|cải thiện|built|developed|optimized|designed|implemented|led)\b",
        text_low,
    )

    sections_Checklist = [
        {
            "key": "contact",
            "label": "Thông tin liên hệ & Hồ sơ số (Email / SĐT / GitHub / LinkedIn)",
            "passed": has_email or has_phone or has_portfolio_or_git,
            "detail": (
                "Đã có thông tin liên hệ / liên kết hồ sơ"
                if (has_email or has_phone or has_portfolio_or_git)
                else "Thiếu Email, SĐT hoặc link GitHub/LinkedIn để nhà tuyển dụng liên hệ"
            ),
        },
        {
            "key": "education",
            "label": "Học vấn, Chuyên ngành & Chứng chỉ / Ngoại ngữ",
            "passed": has_education or has_cert_or_language,
            "detail": (
                "Đã nêu nền tảng học vấn / chứng chỉ ngoại ngữ"
                if (has_education or has_cert_or_language)
                else "Nên bổ sung trường đào tạo, chuyên ngành, GPA hoặc chứng chỉ tiếng Anh (TOEIC/IELTS)"
            ),
        },
        {
            "key": "experience",
            "label": "Kinh nghiệm làm việc & Dự án thực tế",
            "passed": has_experience_or_projects,
            "detail": (
                "Đã mô tả kinh nghiệm làm việc hoặc dự án thực tế"
                if has_experience_or_projects
                else "Chưa nêu rõ các dự án đã làm hoặc kinh nghiệm thực tập/làm việc"
            ),
        },
        {
            "key": "quantified",
            "label": "Minh chứng kết quả bằng con số cụ thể (Quantified Impact)",
            "passed": len(quantified_matches) >= 2,
            "detail": (
                f"Tìm thấy {len(quantified_matches)} chỉ số định lượng & {len(action_verbs)} động từ hành động"
                if len(quantified_matches) >= 2
                else "Mô tả còn chung chung, thiếu con số đo lường kết quả (VD: giảm 30% thời gian, xử lý 50.000 bản ghi)"
            ),
        },
    ]

    # Tính điểm Trụ cột Minh chứng Định lượng (tối đa 20đ)
    impact_score = min(
        20,
        (min(4, len(quantified_matches)) * 3) + (min(4, len(set(action_verbs))) * 2),
    )

    # Tính điểm Trụ cột Cấu trúc ATS (tối đa 15đ)
    structure_score = 0
    if has_email or has_phone:
        structure_score += 3
    if has_portfolio_or_git:
        structure_score += 3
    if has_education:
        structure_score += 3
    if has_experience_or_projects:
        structure_score += 3
    if word_count >= 45:
        structure_score += 3
    elif word_count >= 20:
        structure_score += 2
    structure_score = min(15, structure_score)

    return {
        "word_count": word_count,
        "has_email": has_email,
        "has_phone": has_phone,
        "has_portfolio_or_git": has_portfolio_or_git,
        "has_education": has_education,
        "has_experience_or_projects": has_experience_or_projects,
        "has_cert_or_language": has_cert_or_language,
        "quantified_metrics_count": len(quantified_matches),
        "action_verbs_count": len(set(action_verbs)),
        "impact_score_20": impact_score,
        "structure_score_15": structure_score,
        "sections_checklist": sections_Checklist,
    }

