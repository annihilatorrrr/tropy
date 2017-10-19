'use strict'

const { values } = Object
const { promises: jsonld } = require('jsonld')

const { pick } = require('../common/util')
const { ITEM, PHOTO, SELECTION } = require('../constants/type')
const { TEMPLATE } = require('../constants/ontology')

const { newProperties } = require('./utils')

function makeContext(items, photos, metadata, template, props) {
  const flatten = (acc, ps) => acc.concat(ps)
  const result = {
    '@vocab': 'https://tropy.org/v1/tropy#',
    'template': TEMPLATE.TYPE,
    'item': {
      '@id': ITEM,
      '@container': '@list',
      '@context': {}
    }
  }

  result['item']['@context']['photo'] = {
    '@id': PHOTO,
    '@container': '@list',
    '@context': {
      path: 'http://schema.org/image',
      selection: {
        '@id': SELECTION,
        '@container': '@list',
        '@context': {}
      }
    }
  }

  // fill context up with item metadata fields
  const metadataOfItems = values(pick(metadata, items.map(i => i.id)))
  result['item']['@context'] = newProperties(
    metadataOfItems, result['item']['@context'], true, props, template)

  // add Photo metadata fields to context from all selected photos
  const photoIDs = items.map(i => i.photos).reduce(flatten, [])
  const metadataOfPhotos = values(pick(metadata, photoIDs))
  const photoContext = result['item']['@context']['photo']['@context']
  const newPhotoProperties = newProperties(
    metadataOfPhotos, photoContext, true, props, template)
  result['item']['@context']['photo']['@context'] = newPhotoProperties

  // add Selection metadata fields to context from all selections metadata
  const selectionIDs = values(pick(photos, photoIDs))
        .map(p => p.selections).reduce(flatten, [])
  const metadataOfSelections = values(pick(metadata, selectionIDs))
  const newSelectionProperties = newProperties(
    metadataOfSelections, {}, true, props, template)
  result['item']['@context']['photo']['@context']['selection']['@context'] =
    newSelectionProperties

  return result
}

function renderItem(item, photos, metadata, template, props) {
  // the item starts with a photo property, it may not be overwritten
  let result = { photo: [] }

  // add item metadata
  result = newProperties(metadata[item.id], result, false, props, template)

  // add photo metadata
  result.photo = values(pick(photos, item.photos)).map(p => {
    let photo = {
      path: p.path,
      selection: []
    }

    photo = newProperties(metadata[p.id], photo, false, props, template)

    // add selection metadata
    if (p.selections) {
      photo.selection = p.selections.map(sID => {
        return newProperties(metadata[sID], {}, false, props, template)
      })
    }

    // clear property if there are no selections
    if (!photo.selection.length) {
      delete photo.selection
    }

    return photo
  })

  // clear property if there are no photos
  if (!result.photo.length) {
    delete result.photo
  }

  return result
}

function makeDocument(items, photos, metadata, template, props) {
  const result = {
    template: template.id,
    item: []
  }
  for (const item of items) {
    const rendered = renderItem(item, photos, metadata, template, props)
    result.item.push(rendered)
  }
  return result
}

async function groupedByTemplate(resources, props = {}) {
  const results = []
  for (const resource of resources) {
    const { items, metadata, template, photos } = resource
    const context = makeContext(items, photos, metadata, template, props)
    const document = makeDocument(items, photos, metadata, template, props)
    document['@context'] = context
    results.push(await jsonld.compact(document, context))
  }
  return results
}

module.exports = {
  groupedByTemplate
}
