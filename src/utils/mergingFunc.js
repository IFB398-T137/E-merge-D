// utility function to merge template content with CSV data (using Regex)

export function mergeContent(template, row) {
    return template.replace(/{{(.*?)}}/g, (placeholder, key) => {
        const trimmedKey = key.trim()

        if (!Object.prototype.hasOwnProperty.call(row, trimmedKey)) {
            return placeholder
        }

        return row[trimmedKey] ?? ''
    });
}
