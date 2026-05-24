# E-merge-D

E-merge-D is a web-based email merge application designed to simplify the process of generating personalised Outlook email drafts from CSV data. The project was developed as a proof-of-concept alternative to traditional mail merge workflows, with a focus on usability, template flexibility, and Outlook integration through Microsoft Graph API.

The application allows users to upload recipient data, create or paste HTML/plaintext email templates, preview merged results, and save personalised emails directly to their Outlook Drafts folder rather than automatically sending them. The system is intended to improve workflows for university and administrative environments where large batches of customised emails are frequently required.

## Tech Stack

- React
- Vite
- Microsoft Authentication Library (MSAL)
- Microsoft Graph API
- TinyMCE
- Vitest

## Create an environment variable if this is not setup
Values for the .env are obtained from the Azure/Entra app registration configured for Microsoft authentication and Outlook draft integration.
VITE_MS_CLIENT_ID=your-azure-app-client-id
VITE_MS_TENANT_ID=your-azure-tenant-id
VITE_REDIRECT_URI=http://localhost:5173

## Start the development environment
npm run dev


## Your application should be accessible at:
http://localhost:5173

## Run unit tests: 
npm test

## Manage dependencies in:
package.json
package-lock.json

## Remember to install dependencies
npm install
