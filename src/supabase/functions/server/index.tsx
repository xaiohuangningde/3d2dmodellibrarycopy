import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'npm:@supabase/supabase-js@2'
import * as kv from './kv_store.tsx'

const app = new Hono()

app.use('*', cors())
app.use('*', logger(console.log))

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const BUCKET_NAME = 'make-05abd8f9-models'

// Initialize storage bucket on startup
async function initializeBucket() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME)
    
    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: 52428800, // 50MB limit
      })
      if (error) {
        console.log(`Error creating bucket: ${error.message}`)
      } else {
        console.log(`Bucket ${BUCKET_NAME} created successfully`)
      }
    }
  } catch (error) {
    console.log(`Error initializing bucket: ${error}`)
  }
}

initializeBucket()

// Upload model endpoint
app.post('/make-server-05abd8f9/upload', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const type = formData.get('type') as string // '3d' or '2d'
    const groupId = formData.get('groupId') as string || 'default'
    
    if (!file || !name || !type) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    // Generate unique file path
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const filePath = `${type}/${timestamp}-${name}.${fileExt}`

    // Upload file to Supabase Storage
    const arrayBuffer = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.log(`Upload error: ${uploadError.message}`)
      return c.json({ error: `Upload failed: ${uploadError.message}` }, 500)
    }

    // Store metadata in KV store
    const modelId = `model_${timestamp}`
    const metadata = {
      id: modelId,
      name,
      type,
      filePath: uploadData.path,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      groupId,
      uploadedAt: new Date().toISOString(),
    }

    await kv.set(modelId, metadata)

    return c.json({ success: true, model: metadata })
  } catch (error) {
    console.log(`Upload error: ${error}`)
    return c.json({ error: `Upload failed: ${error}` }, 500)
  }
})

// Get all models endpoint
app.get('/make-server-05abd8f9/models', async (c) => {
  try {
    const models = await kv.getByPrefix('model_')
    
    // Sort by upload date (newest first)
    const sortedModels = models.sort((a, b) => {
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    })

    return c.json({ success: true, models: sortedModels })
  } catch (error) {
    console.log(`Get models error: ${error}`)
    return c.json({ error: `Failed to fetch models: ${error}` }, 500)
  }
})

// Get model file URL endpoint
app.get('/make-server-05abd8f9/model/:id/url', async (c) => {
  try {
    const modelId = c.req.param('id')
    const model = await kv.get(modelId)

    if (!model) {
      return c.json({ error: 'Model not found' }, 404)
    }

    // Check if file exists in storage first
    const { data: fileData, error: existsError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(model.filePath.split('/')[0], {
        search: model.filePath.split('/')[1]
      })

    if (existsError || !fileData || fileData.length === 0) {
      console.log(`File not found in storage: ${model.filePath}`)
      // File doesn't exist, clean up metadata
      await kv.del(modelId)
      return c.json({ error: 'Model file not found in storage' }, 404)
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedData, error: signedError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(model.filePath, 3600)

    if (signedError) {
      console.log(`Signed URL error for ${model.filePath}: ${signedError.message}`)
      return c.json({ error: `Failed to generate URL: ${signedError.message}` }, 500)
    }

    if (!signedData || !signedData.signedUrl) {
      console.log(`No signed URL returned for ${model.filePath}`)
      return c.json({ error: 'Failed to generate signed URL' }, 500)
    }

    return c.json({ success: true, url: signedData.signedUrl })
  } catch (error) {
    console.log(`Get model URL error: ${error}`)
    return c.json({ error: `Failed to get model URL: ${error}` }, 500)
  }
})

// Delete model endpoint
app.delete('/make-server-05abd8f9/models/:id', async (c) => {
  try {
    const modelId = c.req.param('id')
    const model = await kv.get(modelId)

    if (!model) {
      return c.json({ error: 'Model not found' }, 404)
    }

    // Delete file from storage
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([model.filePath])

    if (deleteError) {
      console.log(`Storage delete error: ${deleteError.message}`)
    }

    // Delete metadata from KV store
    await kv.del(modelId)

    return c.json({ success: true, message: 'Model deleted successfully' })
  } catch (error) {
    console.log(`Delete model error: ${error}`)
    return c.json({ error: `Failed to delete model: ${error}` }, 500)
  }
})

// Create group endpoint
app.post('/make-server-05abd8f9/groups', async (c) => {
  try {
    const body = await c.req.json()
    const { name } = body
    
    if (!name) {
      return c.json({ error: 'Group name is required' }, 400)
    }

    const groupId = `group_${Date.now()}`
    const group = {
      id: groupId,
      name,
      createdAt: new Date().toISOString(),
    }

    await kv.set(groupId, group)

    return c.json({ success: true, group })
  } catch (error) {
    console.log(`Create group error: ${error}`)
    return c.json({ error: `Failed to create group: ${error}` }, 500)
  }
})

// Get all groups endpoint
app.get('/make-server-05abd8f9/groups', async (c) => {
  try {
    const groups = await kv.getByPrefix('group_')
    
    // Sort by creation date
    const sortedGroups = groups.sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

    return c.json({ success: true, groups: sortedGroups })
  } catch (error) {
    console.log(`Get groups error: ${error}`)
    return c.json({ error: `Failed to fetch groups: ${error}` }, 500)
  }
})

// Rename group endpoint
app.put('/make-server-05abd8f9/groups/:id', async (c) => {
  try {
    const groupId = c.req.param('id')
    const body = await c.req.json()
    const { name } = body

    if (!name) {
      return c.json({ error: 'Group name is required' }, 400)
    }

    const group = await kv.get(groupId)

    if (!group) {
      return c.json({ error: 'Group not found' }, 404)
    }

    const updatedGroup = { ...group, name }
    await kv.set(groupId, updatedGroup)

    return c.json({ success: true, group: updatedGroup })
  } catch (error) {
    console.log(`Rename group error: ${error}`)
    return c.json({ error: `Failed to rename group: ${error}` }, 500)
  }
})

// Delete group endpoint
app.delete('/make-server-05abd8f9/groups/:id', async (c) => {
  try {
    const groupId = c.req.param('id')
    
    if (groupId === 'default') {
      return c.json({ error: 'Cannot delete default group' }, 400)
    }

    const group = await kv.get(groupId)

    if (!group) {
      return c.json({ error: 'Group not found' }, 404)
    }

    // Move models to default group
    const models = await kv.getByPrefix('model_')
    for (const model of models) {
      if (model.groupId === groupId) {
        await kv.set(model.id, { ...model, groupId: 'default' })
      }
    }

    await kv.del(groupId)

    return c.json({ success: true, message: 'Group deleted successfully' })
  } catch (error) {
    console.log(`Delete group error: ${error}`)
    return c.json({ error: `Failed to delete group: ${error}` }, 500)
  }
})

// Move model to group endpoint
app.put('/make-server-05abd8f9/models/:id/group', async (c) => {
  try {
    const modelId = c.req.param('id')
    const body = await c.req.json()
    const { groupId } = body

    if (!groupId) {
      return c.json({ error: 'Group ID is required' }, 400)
    }

    const model = await kv.get(modelId)

    if (!model) {
      return c.json({ error: 'Model not found' }, 404)
    }

    const updatedModel = { ...model, groupId }
    await kv.set(modelId, updatedModel)

    return c.json({ success: true, model: updatedModel })
  } catch (error) {
    console.log(`Move model to group error: ${error}`)
    return c.json({ error: `Failed to move model: ${error}` }, 500)
  }
})

Deno.serve(app.fetch)