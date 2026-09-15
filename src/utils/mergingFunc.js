// utility function to merge template content with CSV data (using Regex)

export function mergeContent(template, row) {
    return template.replace(/{{(.*?)}}/g, (placeholder, key) => {
        const trimmedKey = key.trim();

        const Key = Object.keys(row).find(
            (rowKey) => rowKey.trim().toLowerCase() === trimmedKey.toLowerCase()

        );

        if (Key === undefined) {
            return placeholder;
        }

        return row[Key] ?? '';
    });
}
