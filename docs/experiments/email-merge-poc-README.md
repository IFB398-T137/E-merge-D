# Email Merge Python Proof of Concept
This folder contains a temporary proof-of-concept used to validate the core email merge logic before implementation in the agreed project tech stack.

## Important Note

Python is not part of the final agreed tech stack. It was used only as a fast prototyping tool to validate the logic.

The validated logic will later be reimplemented in the project backend.

## Files

- `students.csv` — sample test data
- `template.txt` — sample email template using placeholders
- `merge.py` — script that performs the merge

## How to Run

```bash
python merge.py

## Approach

A small Python script was created to:

1. Read student data from a CSV file.
2. Read an email template containing placeholders.
3. Replace placeholders with matching CSV values.
4. Generate personalised draft-style email output.

## Test Data

Example CSV columns:

```csv
Email,FirstName,UnitCode,StartDate
sarah@example.com,Sarah,IFB398,1 May
