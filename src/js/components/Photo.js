import React from 'react';
import API from './API';
import axios from 'axios';
import slugify from 'slugify';

class Photo extends React.Component {

   constructor(props) {
      super(props);
      this.id = this.props.result.id;
      this.thumb = this.props.result.urls.thumb;
      this.img = this.props.result.urls.small;
      //this.full_size = this.props.result.urls.raw;
      this.full_size = this.props.result.urls.full;
      this.author = this.props.result.user.name;
      this.img_title = `${instant_img_localize.photo_by} ${this.author}`;
      this.filename = slugify(this.props.result.alt_description || '') || this.props.result.id;
      this.title = this.img_title;
      this.alt = this.props.result.alt_description;
      this.caption = this.props.result.description;
      this.user = this.props.result.user.username;
      this.user_photo = this.props.result.user.profile_image.small;
      this.link = this.props.result.links.html;
      this.likes = this.props.result.likes;
      this.view_all = instant_img_localize.view_all;
      this.inProgress = false;
      this.container = document.querySelector('.instant-img-container');
      this.showTooltip = this.props.showTooltip;
      this.hideTooltip = this.props.hideTooltip;


      // Gutenberg Sidebar
      this.setAsFeaturedImage = false;
      this.insertIntoPost = false;
      this.is_media_router = this.props.mediaRouter;
      this.is_block_editor = this.props.blockEditor;
      this.SetFeaturedImage = this.props.SetFeaturedImage;
      this.InsertImage = this.props.InsertImage;


      // Display controls in Gutenberg Sidebar Only
      this.displayGutenbergControl = (this.is_block_editor) ? true : false;


      // Photo state
      this.state = {
         filename: this.filename,
         title: this.title,
         alt: this.alt,
         caption: this.caption
      }

   }


   /*
	 * download
	 * Function to trigger the image download
	 *
	 * @since 4.3
	 */
   download(e){

      e.preventDefault();
	   let self = this;

	   let target = e.currentTarget; // get current <a/>
	   let photo = target.parentElement.parentElement.parentElement; // Get parent .photo el
	   let notice = photo.querySelector('.notice-msg'); // Locate .notice-msg div

      if(!target.classList.contains('upload')){ // If target is .download-photo, switch target definition
         target = photo.querySelector('a.upload');
      }

	   if(target.classList.contains('success') || this.inProgress){
	      return false; // Exit if already uploaded or in progress.
	   }
	   this.inProgress = true;

	   target.classList.add('uploading');
	   photo.classList.add('in-progress');


	   // Status messaging
	   notice.innerHTML = instant_img_localize.saving;
	   setTimeout(function(){
		   // Change notice after 3 seconds
		   notice.innerHTML = instant_img_localize.resizing;
		   setTimeout(function(){
			  // Change notice again after 5 seconds (Still resizing...)
			  notice.innerHTML = instant_img_localize.resizing_still;
		   }, 5000);
		}, 3000);


      // API URL
      let api = instant_img_localize.root + 'instant-images/download/';


      // Data Params
	   let data = {
		   id : target.getAttribute('data-id'),
         image_url : target.getAttribute('data-url'),
         filename : target.getAttribute('data-id') +'.jpg',
         custom_filename : target.getAttribute('data-filename'),
         title : target.getAttribute('data-title'),
         alt : target.getAttribute('data-alt'),
         caption : target.getAttribute('data-caption'),
         metadata: this.props.result,
         parent_id : instant_img_localize.parent_id
      }


      // Config Params
      const config = {
	      headers: {
            'X-WP-Nonce': instant_img_localize.nonce,
            'Content-Type': 'application/json'
         }
	  	}

      axios.post(api, JSON.stringify(data), config)
      .then(function (res) {

         let response = res.data;

         if(response){

            // Successful response from server
            let success = response.success;
            let id = response.id;
            let attachment = response.attachment;
            let admin_url = response.admin_url;
            let msg = response.msg;

            if(success){

               // Edit URL
               let edit_url = `${admin_url}post.php?post=${attachment.id}&action=edit`


	            // Success/Upload Complete
               self.uploadComplete(target, photo, msg, edit_url, attachment.id);


               // Trigger Download Counter at Unsplash
               self.triggerUnsplashDownload(id);


               // Set Featured Image [Gutenberg Sidebar]
               if( (self.displayGutenbergControl) && self.setAsFeaturedImage){
                  self.SetFeaturedImage(attachment.id);
                  self.setAsFeaturedImage = false;
                  self.closeMediaModal();
               }


               // Insert Image [Gutenberg Sidebar]
               if( (self.displayGutenbergControl) && self.insertIntoPost){
                  if(attachment.url){
                     self.InsertImage(attachment.url, attachment.caption, attachment.alt);
                     self.closeMediaModal();
                  }
                  self.insertIntoPost = false;
               }


               // If is media popup, redirect user to media-upload settings
               if(self.container.dataset.mediaPopup === 'true' && !self.is_block_editor){
	               window.location = 'media-upload.php?type=image&tab=library&attachment_id='+attachment.id;
               }


            }
            else{
	            // Error
	            self.uploadError(target, photo, notice, msg);

            }

         }
         else {
            // Error
            self.uploadError(target, photo, notice, instant_img_localize.error_upload);
         }

   	})
   	.catch(function (error) {
   		console.log(error);
   	});

   }



   /*
	 * triggerUnsplashDownload
	 * Function to trigger download action at unsplash.com
	 * This is used to give authors download credits and nothing more
	 *
	 * @param id       string    The ID of the image
	 * @since 3.1
	 */
   triggerUnsplashDownload(id){

      let url = `${API.photo_api}/${id}/download/${API.app_id}`;

      fetch(url)
	      .then((data) => data.json())
	      .then(function(data) {
	         // Success, nothing else happens here
	      })
	      .catch(function(error) {
	         console.log(error);
	      });
   }



   /*
	 * setFeaturedImageClick
	 * Function used to trigger a download and then set as featured image
	 *
	 * @since 4.0
	 */
   setFeaturedImageClick(e){
      let target = e.currentTarget;
      if(!target){
         return false;
      }

      this.hideTooltip(e);
      let parent = target.parentNode.parentNode.parentNode;
      let photo = parent.querySelector('a.upload');
      if(photo){
         this.setAsFeaturedImage = true;
         photo.click();
      }
   }



   /*
	 * insertImageIntoPost
	 * Function used to insert an image directly into the block (Gutenberg) editor.
	 *
	 * @since 4.0
	 */
   insertImageIntoPost(e){
      let target = e.currentTarget;
      if(!target){
         return false;
      }

      this.hideTooltip(e);
      let parent = target.parentNode.parentNode.parentNode;
      let photo = parent.querySelector('a.upload');
      if(photo){
         this.insertIntoPost = true;
         photo.click();
      }
   }



   /*
	 * uploadComplete
	 * Function runs when upload has completed
	 *
	 * @param target   element    clicked item
	 * @param photo    element    Nearest parent .photo
	 * @param msg      string     Success Msg
	 * @param url      string     The attachment edit link
	 * @param id       string     The attachment id
	 * @since 3.0
	 */
   uploadComplete(target, photo, msg, url, id){

	   this.setImageTitle(target, msg);

	   photo.classList.remove('in-progress');
	   photo.classList.add('uploaded');

	   photo.querySelector('.edit-photo').style.display = 'none'; // Hide edit-photo button
	   photo.querySelector('.edit-photo-admin').style.display = 'inline-block'; // Show edit-photo-admin button
	   photo.querySelector('.edit-photo-admin').href = url; // Add admin edit link
	   photo.querySelector('.edit-photo-admin').target = '_balnk'; // Add new window

	   target.classList.remove('uploading');
	   target.classList.remove('resizing');
      target.classList.add('success');
	   this.inProgress = false;

	   // Gutenberg Sidebar
	   if(this.is_block_editor){
		   photo.querySelector('.insert').style.display = 'none'; // Hide insert button
		   photo.querySelector('.set-featured').style.display = 'none'; // Hide set-featured button
	   }

	   // Media Router
      this.mediaRouter(id);


	   // Deprecated in 4.3
	   // Was previously used in the Media Popup Context.
	   // Refresh Media Library contents on edit pages
      if(this.container.classList.contains('editor')){
         if(typeof wp.media != 'undefined'){
            if(wp.media.frame.content.get() !== null){
				   wp.media.frame.content.get().collection.props.set({ignore: (+ new Date())});
				   wp.media.frame.content.get().options.selection.reset();
				}else{
					wp.media.frame.library.props.set({ignore: (+ new Date())});
				}
			}
		}
   }



   /**
	 * mediaRouter
	 * Refresh Media Modal and select item after it's been uploaded
	 *
	 * @since 4.3
	 */
   mediaRouter(id){

	   if(this.is_media_router && wp.media && wp.media.frame && wp.media.frame.el){

		   let mediaModal = wp.media.frame.el;
		   let mediaTab = mediaModal.querySelector('#menu-item-browse');
		   if(mediaTab){
			   // Open the 'Media Library' tab
			   mediaTab.click();
		   }

		   // Delay to allow for tab switching
	      setTimeout(function(){
		      if (wp.media.frame.content.get() !== null) {
					//this forces a refresh of the content
					wp.media.frame.content.get().collection._requery(true);

					//optional: reset selection
					//wp.media.frame.content.get().options.selection.reset();
				}

				// Select the attached that was just uploaded.
		      var selection = wp.media.frame.state().get( 'selection' );
		      var selected = parseInt(id);
		      selection.reset( selected ? [ wp.media.attachment( selected ) ] : [] );

	      }, 150);

      }
   }



   /*
	 * uploadError
	 * Function runs when error occurs on upload or resize
	 *
	 * @param target   element    Current clicked item
	 * @param photo    element    Nearest parent .photo
	 * @param notice   element    The message area
	 * @param msg      string     Error Msg
	 * @since 3.0
	 */
   uploadError(target, photo, notice, msg){
	   target.classList.remove('uploading');
	   target.classList.remove('resizing');
	   target.classList.add('errors');
	   this.setImageTitle(target, msg);
      this.inProgress = false;
      notice.classList.add('has-error');
      console.warn(msg);
   }



   /*
	 * setImageTitle
	 * Set the title attribute of target
	 *
	 * @param target   element    Current clicked item
	 * @param msg      string     Title Msg from JSON
	 * @since 3.0
	 */
   setImageTitle(target, msg){
	   target.setAttribute("title", msg); // Remove 'Click to upload...', set new value
   }



   /*
	 * showEditScreen
	 * Displays the edit screen
	 *
	 * @since 3.2
	 */
   showEditScreen(e){
      e.preventDefault();
      let el = e.currentTarget;
      this.hideTooltip(e);
      let photo = el.closest('.photo');
      let filename = photo.querySelector('input[name="filename"]');
      let editScreen = photo.querySelector('.edit-screen');

      editScreen.classList.add('editing'); // Show edit screen

      // Set focus on edit screen
      setTimeout(function(){
         editScreen.focus();
      }, 150);

   }



   /*
	 * handleEditChange
	 * Handles the change event for the edit screen
	 *
	 * @since 3.2
	 */
   handleEditChange(e) {
      let target = e.target.name;

      if(target === 'filename'){
         this.setState({
            filename: e.target.value
         });
      }
      if(target === 'title'){
         this.setState({
            title: e.target.value
         });
      }
      if(target === 'alt'){
         this.setState({
            alt: e.target.value
         });
      }
      if(target === 'caption'){
         this.setState({
            caption: e.target.value
         });
      }
   }



   /*
	 * saveEditChange
	 * Handles the save event for the edit screen
	 *
	 * @since 3.2
	 */
   saveEditChange(e) {

      let el = e.currentTarget;
      let photo = el.closest('.photo');

      // Filename
      let filename = photo.querySelector('input[name="filename"]');
      this.filename = filename.value;

      // Title
      let title = photo.querySelector('input[name="title"]');
      this.title = title.value;

      // Alt
      let alt = photo.querySelector('input[name="alt"]');
      this.alt = alt.value;

      // Caption
      let caption = photo.querySelector('textarea[name="caption"]');
      this.caption = caption.value;

      photo.querySelector('.edit-screen').classList.remove('editing'); // Hide edit screen
      photo.querySelector('a.upload').click();

   }



   /*
	 * cancelEditChange
	 * Handles the cancel event for the edit screen
	 *
	 * @since 3.2
	 */
   cancelEditChange(e) {

      let el = e.currentTarget;
      let photo = el.closest('.photo');
      if(photo){
         let target = photo.querySelector('a.upload');

         // Filename
         let filename = photo.querySelector('input[name="filename"]');
         filename.value = filename.dataset.original;
         this.setState({
            filename: filename.value
         });

         // Title
         let title = photo.querySelector('input[name="title"]');
         title.value = title.dataset.original;
         this.setState({
            title: title.value
         });

         // Alt
         let alt = photo.querySelector('input[name="alt"]');
         alt.value = alt.dataset.original;
         this.setState({
            alt: alt.value
         });

         // Caption
         let caption = photo.querySelector('textarea[name="caption"]');
         caption.value = caption.dataset.original;
         this.setState({
            caption: caption.value
         });

         photo.querySelector('.edit-screen').classList.remove('editing'); // Hide edit screen
         target.focus();
      }
   }



   /*
	 * closeMediaModal
	 * Close the media modal after an action
	 *
	 * @since 4.3
	 */
   closeMediaModal(){
	   let mediaModal = document.querySelector('.media-modal');
	   if(mediaModal){
		   let closeBtn = mediaModal.querySelector('button.media-modal-close');
		   if(!closeBtn){
			   return false;
		   }
		   closeBtn.click();
		}
   }



   render(){

	   let likeTxt = (parseInt(this.likes) > 1) ? instant_img_localize.likes_plural : instant_img_localize.likes;

      return (
	      <article className='photo'>
	         <div className="photo--wrap">
   	         <div className='img-wrap'>
   	            <a
   	            	className='upload loaded'
   						href={this.full_size}
   						data-id={this.id}
   						data-url={this.full_size}
   						data-filename={this.state.filename}
   						data-title={this.state.title}
   						data-alt={this.state.alt}
   						data-caption={this.state.caption}
   						title={instant_img_localize.upload}
   						onClick={(e) => this.download(e)}>
   	               <img src={this.img} alt="" />
   	               <div className="status" />
   	            </a>

   	            <div className="notice-msg"/>

   	            <div className="user-controls">
      	            <a className="user fade" href={'https://unsplash.com/@'+this.user+'?utm_source=wordpress-instant-images&utm_medium=referral'} target="_blank" title={this.view_all +' @'+ this.user}>
      		            <div className="user-wrap">
      		               {this.user_photo.length > 0 &&
      		                  <img src={this.user_photo} />
      		               }
      		               {this.user}
      		            </div>
      	            </a>
      	            <div className="photo-options">

         	            {
            	            this.displayGutenbergControl && (
               	            <button type="button" className="set-featured fade"
               	               data-title={instant_img_localize.set_as_featured}
		         	               onMouseEnter={(e) => this.showTooltip(e)}
		         	               onMouseLeave={(e) => this.hideTooltip(e)}
                                 onClick={(e) => this.setFeaturedImageClick(e)}
               	               >
               	               <i className="fa fa-picture-o" aria-hidden="true"></i>
               	               <span className="offscreen">{instant_img_localize.set_as_featured}</span>
               	            </button>
            	            )
         	            }
         	            {
            	            this.displayGutenbergControl && (
               	            <button type="button" className="insert fade"
               	               data-title={instant_img_localize.insert_into_post}
		         	               onMouseEnter={(e) => this.showTooltip(e)}
		         	               onMouseLeave={(e) => this.hideTooltip(e)}
                                 onClick={(e) => this.insertImageIntoPost(e)}
               	               >
               	               <i className="fa fa-plus" aria-hidden="true"></i>
               	               <span className="offscreen">{instant_img_localize.insert_into_post}</span>
               	            </button>
            	            )
         	            }

         	            <a href="#"
         	               className="edit-photo-admin fade"
         	               data-title={instant_img_localize.edit_upload}
         	               onMouseEnter={(e) => this.showTooltip(e)}
         	               onMouseLeave={(e) => this.hideTooltip(e)}
         	               >
         	               <i className="fa fa-pencil" aria-hidden="true"></i>
                           <span className="offscreen">{instant_img_localize.edit_upload}</span>
         	            </a>

         	            <button type="button"
         	               className="edit-photo fade"
         	               data-title={instant_img_localize.edit_details}
         	               onMouseEnter={(e) => this.showTooltip(e)}
         	               onMouseLeave={(e) => this.hideTooltip(e)}
         						onClick={(e) => this.showEditScreen(e)}
         	               >
         	               <i className="fa fa-cog" aria-hidden="true"></i>
                           <span className="offscreen">{instant_img_localize.edit_details}</span>
         	            </button>
      	            </div>
   	            </div>

   	            <div className="options">
   	            	<span
   	            		className="likes tooltip--above"
   	            		data-title={this.likes + ' ' +likeTxt}
								onMouseEnter={(e) => this.showTooltip(e)}
								onMouseLeave={(e) => this.hideTooltip(e)}>
   	            		<i className="fa fa-heart heart-like" aria-hidden="true"></i> {this.likes}
   	            	</span>
   	            	<a
   	            		className="tooltip--above"
      	               href={this.link}
      	               data-title={instant_img_localize.view_on_unsplash}
	   	            	onMouseEnter={(e) => this.showTooltip(e)}
	   	            	onMouseLeave={(e) => this.hideTooltip(e)}
      	               target="_blank">
      	               <i className="fa fa-external-link" aria-hidden="true"></i>
                        <span className="offscreen">{instant_img_localize.view_on_unsplash}</span>
      	            </a>
         	      </div>

               </div>

	            <div className="edit-screen" tabIndex="0">
	               <div className="edit-screen--title">
	                  <p className="heading">{instant_img_localize.edit_details}</p>
	                  <p>{instant_img_localize.edit_details_intro}.</p>
	               </div>
	               <label>
	                  <span>{instant_img_localize.edit_filename}:</span>
	                  <input type="text" name="filename" data-original={this.filename} placeholder={this.filename} value={this.state.filename} onChange={(e) => this.handleEditChange(e)} />
	                  <em>.jpg</em>
	               </label>
	               <label>
	                  <span>{instant_img_localize.edit_title}:</span>
	                  <input type="text" name="title" data-original={this.title} placeholder={this.title} value={this.state.title || ''} onChange={(e) => this.handleEditChange(e)} />
	               </label>
	               <label>
	                  <span>{instant_img_localize.edit_alt}:</span>
	                  <input type="text" name="alt" data-original={this.alt} value={this.state.alt || ''} onChange={(e) => this.handleEditChange(e)} />
	               </label>
	               <label>
	                  <span>{instant_img_localize.edit_caption}:</span>
	                  <textarea rows="3" name="caption" data-original="" onChange={(e) => this.handleEditChange(e)} value={this.state.caption || ''}></textarea>
	               </label>
	               <div className="edit-screen--controls">
	                  <button type="button" className="button" onClick={(e) => this.cancelEditChange(e)}>{instant_img_localize.cancel}</button> &nbsp;
	                  <button type="button" className="button button-primary" onClick={(e) => this.saveEditChange(e)}>{instant_img_localize.upload_now}</button>
	               </div>
	            </div>

	         </div>
	      </article>
      )
   }
}

export default Photo;
