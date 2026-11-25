"""
Generates a clean SVG ER diagram (hospital_er.svg) showing all 9 entities,
primary/foreign keys, and relationship cardinalities using Python stdlib only.
"""

import os

OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hospital_er.svg")


def entity_box(x, y, w, title, fields):
    row_h = 22
    header_h = 30
    total_h = header_h + len(fields) * row_h + 10
    lines = [
        f'<g transform="translate({x},{y})">',
        f'  <rect width="{w}" height="{total_h}" rx="8" fill="#ffffff" stroke="#3b6ea5" stroke-width="1.6"/>',
        f'  <rect width="{w}" height="{header_h}" rx="8" fill="#e6eff8" stroke="#3b6ea5" stroke-width="1.6"/>',
        f'  <rect y="{header_h - 6}" width="{w}" height="6" fill="#e6eff8"/>',
        f'  <text x="{w/2}" y="20" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" '
        f'font-size="13" font-weight="700" fill="#183b61">{title}</text>',
    ]
    for i, (tag, name) in enumerate(fields):
        fy = header_h + 20 + i * row_h
        if tag == "PK":
            lines.append(
                f'  <text x="12" y="{fy}" font-family="Segoe UI, Arial, sans-serif" '
                f'font-size="11" font-weight="700" fill="#1d5fa3">PK</text>'
            )
            lines.append(
                f'  <text x="42" y="{fy}" font-family="Consolas, monospace" '
                f'font-size="12" font-weight="700" text-decoration="underline" fill="#1e293b">{name}</text>'
            )
        elif tag == "FK":
            lines.append(
                f'  <text x="12" y="{fy}" font-family="Segoe UI, Arial, sans-serif" '
                f'font-size="11" font-weight="700" fill="#b45309">FK</text>'
            )
            lines.append(
                f'  <text x="42" y="{fy}" font-family="Consolas, monospace" '
                f'font-size="12" fill="#334155">{name}</text>'
            )
        else:
            lines.append(
                f'  <text x="42" y="{fy}" font-family="Consolas, monospace" '
                f'font-size="12" fill="#475569">{name}</text>'
            )
    lines.append("</g>")
    return "\n".join(lines)


def build_svg():
    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="860" viewBox="0 0 1120 860">',
        '  <rect width="1120" height="860" fill="#fbfcfe"/>',
        '  <text x="560" y="34" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" '
        'font-size="18" font-weight="700" fill="#0f172a">'
        'Hospital &amp; Healthcare Information Management System - ER Model</text>',
        # Relationship connectors
        '  <g stroke="#64748b" stroke-width="1.5" fill="none">',
        '    <path d="M 155 188 L 155 235"/>',  # DEPARTMENTS -> DOCTORS
        '    <path d="M 275 300 L 345 300 L 345 430 L 415 430"/>',  # DOCTORS -> APPOINTMENTS
        '    <path d="M 275 645 L 345 645 L 345 470 L 415 470"/>',  # PATIENTS -> APPOINTMENTS
        '    <path d="M 675 450 L 755 450"/>',  # APPOINTMENTS -> spine
        '    <path d="M 755 125 L 755 755"/>',  # vertical spine
        '    <path d="M 755 125 L 820 125"/>',  # -> MEDICAL_HISTORY
        '    <path d="M 755 275 L 820 275"/>',  # -> PRESCRIPTIONS
        '    <path d="M 955 340 L 955 385"/>',  # PRESCRIPTIONS -> PRESCRIPTION_ITEMS
        '    <path d="M 755 585 L 820 585"/>',  # -> DIAGNOSTIC_TESTS
        '    <path d="M 755 755 L 820 755"/>',  # -> BILLS
        '  </g>',
        # Cardinality labels
        '  <g font-family="Segoe UI, Arial, sans-serif" font-size="12" font-weight="700" fill="#334155">',
        '    <text x="163" y="205">1</text><text x="163" y="228">N</text>',
        '    <text x="285" y="292">1</text><text x="398" y="422">N</text>',
        '    <text x="285" y="638">1</text><text x="398" y="490">N</text>',
        '    <text x="688" y="442">1</text>',
        '    <text x="803" y="118">1</text>',
        '    <text x="803" y="268">1</text>',
        '    <text x="963" y="356">1</text><text x="963" y="378">N</text>',
        '    <text x="803" y="578">N</text>',
        '    <text x="803" y="748">N</text>',
        '  </g>',
    ]

    parts.append(entity_box(35, 60, 240, "DEPARTMENTS", [
        ("PK", "dept_id"), ("", "dept_name"), ("", "location"), ("", "phone")
    ]))
    parts.append(entity_box(35, 235, 240, "DOCTORS", [
        ("PK", "doctor_id"), ("", "doctor_name"), ("", "specialization"), ("FK", "dept_id")
    ]))
    parts.append(entity_box(35, 550, 240, "PATIENTS", [
        ("PK", "patient_id"), ("", "full_name"), ("", "dob"),
        ("", "gender"), ("", "phone"), ("", "email")
    ]))
    parts.append(entity_box(415, 385, 260, "APPOINTMENTS", [
        ("PK", "appt_id"), ("FK", "patient_id"), ("FK", "doctor_id"),
        ("", "appt_date"), ("", "status")
    ]))
    parts.append(entity_box(820, 60, 265, "MEDICAL_HISTORY", [
        ("PK", "history_id"), ("FK", "appt_id"), ("", "condition"), ("", "diagnosed_on")
    ]))
    parts.append(entity_box(820, 225, 265, "PRESCRIPTIONS", [
        ("PK", "presc_id"), ("FK", "appt_id"), ("", "issued_on")
    ]))
    parts.append(entity_box(820, 385, 265, "PRESCRIPTION_ITEMS", [
        ("PK", "item_id"), ("FK", "presc_id"), ("", "medicine"),
        ("", "dosage"), ("", "duration_days")
    ]))
    parts.append(entity_box(820, 535, 265, "DIAGNOSTIC_TESTS", [
        ("PK", "test_id"), ("FK", "appt_id"), ("", "test_name"),
        ("", "result"), ("", "tested_on")
    ]))
    parts.append(entity_box(820, 700, 265, "BILLS", [
        ("PK", "bill_id"), ("FK", "appt_id"), ("", "amount"),
        ("", "paid_amount"), ("", "bill_date")
    ]))

    parts.append(
        '  <text x="35" y="838" font-family="Segoe UI, Arial, sans-serif" font-size="12" fill="#475569">'
        '<tspan font-weight="700" fill="#1d5fa3">PK</tspan> primary key  |  '
        '<tspan font-weight="700" fill="#b45309">FK</tspan> foreign key  |  '
        '1 : N one-to-many  |  1 : 1 one-to-one</text>'
    )
    parts.append("</svg>")
    return "\n".join(parts)


if __name__ == "__main__":
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write(build_svg())
    print(f"ER diagram written to {OUT_PATH}")
