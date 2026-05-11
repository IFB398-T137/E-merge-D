// parsing a CSV file into an array of objects

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

export function parseFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        const isCSV = file.name.toLowerCase().endsWith('.csv')

        if (!isCSV) {
            reject(new Error('Unsupported file type. Please upload a CSV file.'))
            return
        }

        reader.onload = (e) => resolve(parseCSV(e.target.result))
        reader.readAsText(file)
    })
}
