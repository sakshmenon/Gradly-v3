from pathlib import Path
from overwrite_classes_from_cs_html import extract_courses_from_html
import os

HTML_PATH = Path(os.environ.get("CS_CLASSES_HTML", "CS classes.html"))

courses = extract_courses_from_html(HTML_PATH)
