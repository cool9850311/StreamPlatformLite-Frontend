import Swal from 'sweetalert2'
import { defineNuxtPlugin } from '#app'

declare module '#app' {
  interface NuxtApp {
    $swal: typeof Swal
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.provide('swal', Swal)
}) 