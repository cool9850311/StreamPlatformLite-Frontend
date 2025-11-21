export default defineNuxtPlugin(() => {
    const config = useRuntimeConfig()

    // Configure default axios/fetch behavior
    const api = $fetch.create({
        baseURL: config.public.BACKEND_URL,
        credentials: 'include', // Important: allow cookies to be sent
        headers: {
            'Content-Type': 'application/json',
        },
    })

    return {
        provide: {
            api
        }
    }
})
