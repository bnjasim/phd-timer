#!/usr/bin/env python
# @author Binu Jasim
# @created on 03-Jan-2017

import webapp2
import os
import jinja2

template_dir = os.path.join(os.path.dirname(__file__), 'templates')
jinja_env = jinja2.Environment(loader = jinja2.FileSystemLoader(template_dir), 
								autoescape = True)

class Handler(webapp2.RequestHandler):
	def write(self, *a, **kw):
		self.response.out.write(*a, **kw)
	
	def render_str(self, template, **params):
		try:
			return (jinja_env.get_template(template)).render(params)
		except:
			return (jinja_env.get_template('blog/blog-error.html')).render()

	def render(self, template, **html_add_ins):
		self.write(self.render_str(template, **html_add_ins))
	

class TimerHandler(Handler):
	def get(self):	
		self.render('timer.html')		
		#self.response.out.write(url)

app = webapp2.WSGIApplication([

    ('/', TimerHandler)
], debug=True)
