// utility function to merge template content with CSV data (using Regex)

export function mergeContent(template, row) {
    return template.replace(/{{(.*?)}}/g, (_, key) => row[key.trim()] || '');
}