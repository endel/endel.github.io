/* jshint devel:true */

var repositories = document.querySelectorAll('.blocks.github a');
for (let i=0; i<repositories.length;i++) {
  fetch("https://api.github.com/repos/" + repositories[i].dataset.repository).then(function(response) {
    return response.json();
  }).then(function(json) {
    repositories[i].querySelector('span.count').innerText = json.stargazers_count
  })
}

var modal = $('.modal');

modal.find('a.close').click(function(e) {
  e.preventDefault()

  modal.addClass('hidden')
})

$('body').on('click', 'ul.blocks:not(.github) a', function(e) {
  e.preventDefault()

  $('.modal article').css('display', 'none');
  modal.removeClass('hidden');

  var item = $('.modal #' + $(this).data('id'))
  item.css('display', 'block');
  item.find('.gallery a:first').click()
})

$('body').on('click', '.modal .gallery a', function(e) {
  e.preventDefault();

  var mainItem = $(this).parents('article').find('.main-item');

  if ($(this).data('video')) {
    mainItem.html(
      `<iframe src="${ $(this).data('video') }" height="380" width="500" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>`
    )
  } else {
    mainItem.html('<img src="' + $(this).data('image') + '" />')
  }

})
