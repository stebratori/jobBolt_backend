import crypto from 'crypto';

export default class URLManager {
    // Static method to add query parameters to a base URL
    static addUrlParameters(baseUrl, params) {
        const url = new URL(baseUrl);

        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value.toString());
        });

        return url.toString();
    }

    // Static method to create a URL for the job posting with query parameters
    static createUrlForJobPosting(jobID, companyID) {
        const queryParams = { jobID: jobID, companyID: companyID };
        const url = 'https://job-bolt.com'; // Replace with your base URL
        return URLManager.addUrlParameters(url, queryParams);
    }
}
