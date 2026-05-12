const supabase = require('../config/db')

const AVATAR_BUCKET = 'avatars'

async function ensureAvatarBucket() {
  const { data, error } = await supabase.storage.listBuckets()

  if (error) {
    throw error
  }

  const avatarBucket = Array.isArray(data)
    ? data.find((bucket) => bucket.name === AVATAR_BUCKET)
    : null

  if (avatarBucket) {
    if (!avatarBucket.public) {
      const { error: updateError } = await supabase.storage.updateBucket(AVATAR_BUCKET, {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024
      })

      if (updateError) {
        throw updateError
      }
    }

    return { created: false, bucket: AVATAR_BUCKET }
  }

  const { data: createdBucket, error: createError } = await supabase.storage.createBucket(AVATAR_BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024
  })

  if (createError) {
    throw createError
  }

  return { created: true, bucket: createdBucket?.name || AVATAR_BUCKET }
}

module.exports = {
  ensureAvatarBucket,
  AVATAR_BUCKET
}