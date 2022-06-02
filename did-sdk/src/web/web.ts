import { DIDDocument, parse } from 'did-resolver'
import fetch from 'node-fetch'
import { ReadOnlyDidDocAPI } from '../did-documents.js'

const DOC_PATH = '/.well-known/did.json'

async function get(url: string): Promise<any> {
  const res = await fetch(url)
  if (res.status >= 400) {
    throw new Error(`Bad response ${res.statusText}`)
  }
  return res.json()
}

export async function resolve(didUri: string): Promise<ReadOnlyDidDocAPI> {
  const parsed = parse(didUri)
  if (!parsed) throw new Error(`Invalid DID: ${didUri}`)
  let path = decodeURIComponent(parsed.id) + DOC_PATH
  const id = parsed.id.split(':')
  if (id.length > 1) {
    path = id.map(decodeURIComponent).join('/') + '/did.json'
  }

  const url = new URL(`https://${path}`)
  if (url.hostname === 'localhost') {
    url.protocol = 'http:'
  }

  const didDocumentMetadata = {}
  let didDocument: DIDDocument | null = null

  try {
    didDocument = await get(url.toString())
  } catch (error) {
    throw new Error(
      `DID must resolve to a valid https URL containing a JSON document: ${error}`,
    )
  }
  if (!didDocument) throw new Error('Server did not respond with DID Document')

  // TODO: this excludes the use of query params
  const docIdMatchesDid = didDocument?.id === didUri
  if (!docIdMatchesDid) {
    throw new Error(`DID document id does not match requested did`)
  }

  return new ReadOnlyDidDocAPI(didDocument, didDocumentMetadata)
}
