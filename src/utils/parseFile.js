// parsing a data file (either .xlsx or .csv) into an array of objects 

import * as XLSX from 'xlsx';

// for .csv files, built-in JS functions are used
function parseCSV(text) {
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(header => header.trim())

    const data = lines.slice(1).map(line => {
        const values = line.split(',').map(value => value.trim())
        const row = {}
        headers.forEach((header, index) => {
            row[header] = values[index] || '' // to handle missing values
        })
        return row
    })
    
    return { headers, data }
}

function parseXLSX(array) {
    const workbook = XLSX.read(array, { type: 'array' })
    const sheet = workbook.Sheets[workbook.Sheets[0]] 
    const rows = XLSX.utils.sheet_to_json(sheet)
    const headers = Object.keys(rows[0] || {}) 
    return { headers, rows }
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

