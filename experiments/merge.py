import csv

with open("template.txt", "r", encoding="utf-8") as file:
    template = file.read()

with open("students.csv", "r", encoding="utf-8") as file:
    reader = csv.DictReader(file)

    for row in reader:
        email_body = template

        for column_name, value in row.items():
            placeholder = "{" + column_name + "}"
            email_body = email_body.replace(placeholder, value)

        print("=" * 40)
        print("To:", row["Email"])
        print("Subject:", f"Placement details for {row['UnitCode']}")
        print()
        print(email_body)