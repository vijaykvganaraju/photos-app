const gallery = document.querySelector('#gallery')
const photoInput = document.querySelector('#photo-input')
const providerPills = document.querySelector('#provider-pills')
const tileTemplate = document.querySelector('#tile-template')
const viewer = document.querySelector('#viewer')
const viewerImage = document.querySelector('#viewer-image')
const viewerClose = document.querySelector('#viewer-close')
const viewerPrev = document.querySelector('#viewer-prev')
const viewerNext = document.querySelector('#viewer-next')
const viewerMetaToggle = document.querySelector('#viewer-meta-toggle')
const viewerMeta = document.querySelector('#viewer-meta')
const viewerMetaClose = document.querySelector('#viewer-meta-close')

const metaName = document.querySelector('#meta-name')
const metaType = document.querySelector('#meta-type')
const metaSize = document.querySelector('#meta-size')
const metaUploaded = document.querySelector('#meta-uploaded')
const metaProvider = document.querySelector('#meta-provider')
const metaChecksum = document.querySelector('#meta-checksum')

let photosCache = []
let currentPhotoIndex = -1

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options)
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed: ${response.status}`)
  }

  return response.json()
}

const formatSize = (sizeInBytes) => {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`
  }

  const kb = sizeInBytes / 1024
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`
  }

  return `${(kb / 1024).toFixed(2)} MB`
}

const updateViewerMeta = (photo) => {
  metaName.textContent = photo.filename || '-'
  metaType.textContent = photo.mimeType || '-'
  metaSize.textContent = typeof photo.size === 'number' ? formatSize(photo.size) : '-'
  metaUploaded.textContent = photo.uploadedAt ? new Date(photo.uploadedAt).toLocaleString() : '-'
  metaProvider.textContent = photo.provider || '-'
  metaChecksum.textContent = photo.checksumSha256 || '-'
}

const preloadAround = (index) => {
  const neighbors = [index - 1, index + 1]
  for (const candidateIndex of neighbors) {
    const item = photosCache[candidateIndex]
    if (!item) {
      continue
    }

    const preload = new Image()
    preload.src = item.url
  }
}

const showViewerPhoto = (index) => {
  if (index < 0 || index >= photosCache.length) {
    return
  }

  currentPhotoIndex = index
  const photo = photosCache[currentPhotoIndex]
  viewerImage.src = photo.url
  viewerImage.alt = photo.filename || 'Selected photo'
  updateViewerMeta(photo)
  preloadAround(currentPhotoIndex)
}

const openViewer = (index) => {
  if (!viewer.open) {
    viewer.showModal()
  }

  showViewerPhoto(index)
}

const closeViewer = () => {
  if (viewer.open) {
    viewer.close()
  }

  currentPhotoIndex = -1
  viewerMeta.hidden = true
}

const nextPhoto = () => {
  if (currentPhotoIndex < 0 || photosCache.length < 2) {
    return
  }

  const nextIndex = (currentPhotoIndex + 1) % photosCache.length
  showViewerPhoto(nextIndex)
}

const previousPhoto = () => {
  if (currentPhotoIndex < 0 || photosCache.length < 2) {
    return
  }

  const previousIndex = (currentPhotoIndex - 1 + photosCache.length) % photosCache.length
  showViewerPhoto(previousIndex)
}

const renderProviders = (providers) => {
  providerPills.innerHTML = ''

  providers.forEach((provider) => {
    const pill = document.createElement('span')
    pill.className = 'pill'
    pill.textContent = provider
    providerPills.appendChild(pill)
  })
}

const renderPhotos = (photos) => {
  photosCache = photos
  gallery.innerHTML = ''

  if (photos.length === 0) {
    const empty = document.createElement('p')
    empty.textContent = 'No photos yet. Upload a few images to get started.'
    gallery.appendChild(empty)
    return
  }

  photos.forEach((photo, index) => {
    const node = tileTemplate.content.firstElementChild.cloneNode(true)
    const image = node.querySelector('img')
    const provider = node.querySelector('.photo-provider')
    const date = node.querySelector('.photo-date')

    image.src = photo.url
    image.alt = photo.filename || 'Photo'
    provider.textContent = photo.provider
    date.textContent = formatDate(photo.uploadedAt)
    node.addEventListener('click', () => {
      openViewer(index)
    })

    gallery.appendChild(node)
  })
}

const refreshGallery = async () => {
  const payload = await fetchJson('/api/photos')
  renderPhotos(payload.photos)
}

const uploadFiles = async (files) => {
  const formData = new FormData()
  for (const file of files) {
    formData.append('photo', file)
  }

  await fetchJson('/api/photos/upload', {
    method: 'POST',
    body: formData
  })

  await refreshGallery()
}

photoInput.addEventListener('change', async () => {
  const files = [...photoInput.files]
  if (files.length === 0) {
    return
  }

  try {
    await uploadFiles(files)
  } catch (error) {
    alert(error.message)
  } finally {
    photoInput.value = ''
  }
})

const bootstrap = async () => {
  const providerPayload = await fetchJson('/api/providers')
  renderProviders(providerPayload.providers)
  await refreshGallery()
}

viewerClose.addEventListener('click', closeViewer)
viewerPrev.addEventListener('click', previousPhoto)
viewerNext.addEventListener('click', nextPhoto)
viewerMetaToggle.addEventListener('click', () => {
  viewerMeta.hidden = !viewerMeta.hidden
})

viewerMetaClose.addEventListener('click', () => {
  viewerMeta.hidden = true
})

viewer.addEventListener('click', (event) => {
  if (event.target === viewer) {
    closeViewer()
  }
})

document.addEventListener('keydown', (event) => {
  if (!viewer.open) {
    return
  }

  if (event.key === 'ArrowRight') {
    nextPhoto()
  }

  if (event.key === 'ArrowLeft') {
    previousPhoto()
  }

  if (event.key.toLowerCase() === 'i') {
    viewerMeta.hidden = !viewerMeta.hidden
  }

  if (event.key === 'Escape') {
    closeViewer()
  }
})

bootstrap().catch((error) => {
  gallery.innerHTML = `<p>Could not load app: ${error.message}</p>`
})
