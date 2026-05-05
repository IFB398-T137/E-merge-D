// Merges the parsed data into the template

export function mergeContent(template, row) {
    return template.replace(/{{(.*?)}}/g, (_, key) => row[key.trim()] || '');
}