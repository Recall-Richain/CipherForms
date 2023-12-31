import type {
  FormReturn,
  FormStatus
} from '@root/declarations/backend/backend.did.d.ts'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './authStore'
import { useGeneralUtils } from '@/composables/useGeneralUtils'
import type { Principal } from '@dfinity/principal'

const { sanitizeHTML } = useGeneralUtils()

export const useFormStore = defineStore('form', () => {
  /*
   * Main store values
   */
  const forms = ref<FormReturn[]>([])

  // useful variables
  const authStore = useAuthStore()

  // function to get all forms
  const fetchFormsByUser = async () => {
    // fetch the forms
    const res = await authStore.actor?.get_forms_by_user_principal()
    // set the forms
    if (res && 'ok' in res) {
      forms.value = res.ok
    }
    if (res && 'err' in res) {
      throw new Error(res.err)
    }
    if (!res) {
      throw new Error('No response from server')
    }

    return forms.value
  }

  // get form by id
  const getFormById = async (formId: string) => {
    // check if we have forms
    if (!forms.value.length) {
      const res = await fetchFormsByUser()
      if (!res.length) return undefined
    }
    // get the form from store
    let form = forms.value.find((f) => f.id === formId) as FormReturn

    // if no form, get by ID
    if (!form) {
      const res = await authStore.actor?.get_form_by_id(formId)
      if (!res) {
        throw new Error('No response from server')
      }
      if ('err' in res) {
        throw new Error(res.err)
      }
      if ('ok' in res) {
        // add form to forms
        forms.value.push(res.ok)
        form = res.ok
      }
    }
    // return the form
    return form
  }

  // update form settings
  const updateFormSettings = async (
    form_id: string,
    settings: {
      name: string
      status: 'active' | 'inactive'
      users: Principal[]
    }
  ) => {
    // get the form
    const form = await getFormById(form_id)

    // check if form
    if (!form) throw new Error('No form found')

    // make sure status is valid
    const status = { [settings.status]: null } as FormStatus

    // update the form
    const res = await authStore.actor?.update_form_settings(
      form.id,
      sanitizeHTML(settings.name),
      status,
      settings.users as Principal[]
    )

    if (!res) {
      throw new Error('No response from server')
    }
    if ('err' in res) {
      throw new Error(res.err)
    }

    if ('ok' in res) {
      // update form
      form.name = settings.name
      form.status = status
      form.users = settings.users
    }
  }

  // delete form
  const deleteForm = async (form: FormReturn) => {
    // delete the form
    const res = await authStore.actor?.delete_form(form.id)

    if (!res) {
      throw new Error('No response from server')
    }
    if ('err' in res) {
      throw new Error(res.err)
    }

    if ('ok' in res) {
      // update forms array
      forms.value = forms.value.filter((f) => f.id !== form.id)
    }
  }

  // create form
  const createForm = async (
    newForm: {
      name: string
      status: 'active' | 'inactive'
      users: Principal[]
    }
  ) => {
    // check if name
    if (!newForm.name) {
      throw new Error('No name provided for form')
    }
    const res = await authStore.actor?.create_form(
      sanitizeHTML(newForm.name),
      { [newForm.status]: null } as FormStatus,
      newForm.users,
      ''
    )

    if (!res) {
      throw new Error('No response from server')
    }
    if ('err' in res) {
      throw new Error(res.err)
    }
    // push to beginning of forms
    forms.value.unshift(res.ok)

    return res.ok
  }

  // clear the store
  const clear = () => {
    forms.value = []
  }

  return { fetchFormsByUser, getFormById, deleteForm, createForm, updateFormSettings, clear, forms }
})
