// parsing a CSV file into an array of objects

// for .csv files, built-in JS functions are used
function parseCSV(text) {
    const rows = []
    let currentRow = []
    let currentValue = ''
    let inQuotes = false

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index]
        const nextChar = text[index + 1]

        if (char === '"' && inQuotes && nextChar === '"') {
            currentValue += '"'
            index += 1
        } else if (char === '"') {
            inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentValue.trim())
            currentValue = ''
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') index += 1
            currentRow.push(currentValue.trim())
            rows.push(currentRow)
            currentRow = []
            currentValue = ''
        } else {
            currentValue += char
        }
    }

    if (currentValue || currentRow.length > 0) {
        currentRow.push(currentValue.trim())
        rows.push(currentRow)
    }

    const nonEmptyRows = rows.filter(row => row.some(value => value !== ''))
    const headers = (nonEmptyRows[0] || []).map(header => header.trim())

    const data = nonEmptyRows.slice(1).map(values => {
        const row = {}
        headers.forEach((header, index) => {
            row[header] = values[index] || '' // to handle missing values
        })
        return row
    })
    
    return { headers, data }
}

function readFileAsText(file) {
    if (typeof file.text === 'function') {
        return file.text()
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = () => reject(new Error('Unable to read CSV file.'))
        reader.readAsText(file)
    })
}

export async function parseFile(file) {
    const isCSV = file.name.toLowerCase().endsWith('.csv')

    if (!isCSV) {
        throw new Error('Unsupported file type. Please upload a CSV file.')
    }

    const text = await readFileAsText(file)
    return parseCSV(text)
}
