import 'popper.js';
import 'bootstrap';
import '@coreui/coreui';

$(function() {
	// spinner buttons
	$('.btn-spinner').on('click', function(e){
        if (!(e.shiftKey || e.ctrlKey || e.metaKey)) {
            $(this).css({'pointer-events':'none'});
            $(this).find('i').removeClass().addClass('fa fa-spinner');
        }
	});

	// dropdown Menu
	$('.dropdown-toggle').on('click', function() {
		$(this).parent().toggleClass('open');
	});
	$('.dropdown-item').on('click', function() {
		$(this).closest('.open').removeClass('open');
	});
	$('.dropdown-menu').on('mouseleave', function(){
		$(this).parent('.dropdown').removeClass('open');
	});

	// remove empty nav titles when no children there
    $('.nav-title').filter(function() {
        return !$(this).next().hasClass('nav-item');
    }).hide();
});