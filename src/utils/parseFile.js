// utility function to parse CSV and XLSX files

import * as XLSX from 'xlsx';

function parseCSV(text) {
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(header => header.trim())

    const data = lines.slice(1).map(line => {
        const values = line.split(',').map(value => value.trim())
        const row = {}
        headers.forEach((header, index) => {
            row[header] = values[index] || ''
        })
        return row
    })

    return { headers, data }
}

function parseXLSX(array) {
    const workbook = XLSX.read(array, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]  // fix here
    const rows = XLSX.utils.sheet_to_json(sheet)
    const headers = Object.keys(rows[0] || {})
    return { headers, data: rows }  // renamed rows to data to match parseCSV
}

export function parseFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader()
        const isCSV = file.name.endsWith('.csv')
        const isXLSX = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

        if (isCSV) {
            reader.onload = (e) => resolve(parseCSV(e.target.result))
            reader.readAsText(file)
        } else if (isXLSX) {
            reader.onload = (e) => resolve(parseXLSX(e.target.result))
            reader.readAsArrayBuffer(file)
        }
    })
}