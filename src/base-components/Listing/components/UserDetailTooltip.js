const UserDetailTooltip = {
template:`
	<v-popover class="avatar-tooltip-trigger"
		trigger="click" 
        :placement="placement"
		offset="5"
		container="body"
		:auto-hide="true"
	>

        <img :src="user.avatar_thumb_url" class="avatar-photo" :alt="user.full_name" v-if="user.avatar_thumb_url">
        <div class="avatar-initials" v-if="!user.avatar_thumb_url">
			{{ abbr }}
		</div>

		<div class="avatar-full-name" v-if="options.showFullNameLabel">
			{{ user.full_name }}
		</div>

		<template slot="popover">
			<div class="user-avatar">
				<img :src="user.avatar_thumb_url" class="avatar-photo" :alt="user.full_name" v-if="user.avatar_thumb_url">
				<div class="avatar-initials" v-else>
					{{ abbr }}
				</div>
			</div>

			<div class="user-info">
				<h3>{{ user.full_name }} <small v-if="userText">| <strong style="text-transform: uppercase">{{ userText }}</strong></small></h3>
				<a v-if="user.email" v-bind:href="['mailto:' + user.email]">{{ user.email }}</a>

				<slot></slot>
			</div>
		</template>
    </v-popover>
`,

	props: {
		user: {
			type: Object,
			required: true
		},
        userText: {
			type: String,
            default: function() {
            	return '';
			}
		},
        text: {
		type: String,
            default: function() {
                return '';
			}
		},
    	options: {
			type: Object,
            default: function() {
                return {
					showFullNameLabel: true
	  			}
  			}
		},
        placement: {
			type: String,
            default: function() {
                return 'top';
			}
		},
	},
	computed: {
		abbr() {
			return `${this.user.first_name.slice(0, 1)}${this.user.last_name.slice(0, 1)}`;
		}
	}
};

export default UserDetailTooltip;
