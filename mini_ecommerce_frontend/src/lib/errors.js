export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err.response) return 'No internet connection. Please check your network.'
  return fallback
}
