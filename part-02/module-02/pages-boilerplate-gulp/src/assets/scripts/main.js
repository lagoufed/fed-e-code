// TODO: site logics

// const $ = window.$

console.log($)

$($ => {
  const $body = $('html, body')

  $('#scroll_top').on('click', () => {
    $body.animate({ scrollTop: 0 }, 600)
    return false
  })
})
