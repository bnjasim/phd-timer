#!/usr/bin/env python
# @author Binu Jasim
# @created on 03-Jan-2017

import webapp2
import os
import jinja2
from google.appengine.ext import ndb
from google.appengine.api import users
import logging
import datetime

template_dir = os.path.join(os.path.dirname(__file__), 'templates')
jinja_env = jinja2.Environment(loader = jinja2.FileSystemLoader(template_dir), autoescape = True)

# username is not Id because users might change their user name or email
class Account(ndb.Model):
	nickname = ndb.StringProperty()
	email = ndb.StringProperty()
	userCreated = ndb.DateTimeProperty(auto_now_add = True)

	@classmethod
	@ndb.transactional
	def my_get_or_insert(cls, id, **kwds):
		key = ndb.Key(cls, id)
		ent = key.get()
		if ent is not None:
			return False  # False meaning "Already existing"
		ent = cls(**kwds)
		ent.key = key
		ent.put()
		return True  # True meaning "Newly created"
	
class Entry(ndb.Model):
	# The parent of an Entry is Account
	date = ndb.DateProperty(required = True)	
	hours = ndb.IntegerProperty()
	mins = ndb.IntegerProperty()
	notes = ndb.TextProperty()

# Only a single instance of this Entity type is required.
# Should have found other way! But keeping in client side or in memcache don't seem to be good
class Work(ndb.Model):
	active = ndb.BooleanProperty(default = False)
	starth = ndb.IntegerProperty()
	startm = ndb.IntegerProperty()
	totalh = ndb.IntegerProperty()
	totalm = ndb.IntegerProperty()
	date = ndb.DateProperty()


class RegisterUserHandler(webapp2.RequestHandler):
	"Redirected to here from the login page. So always user is not None"
	def get(self):
		user = users.get_current_user()
		if user:
			user_id = user.user_id()
			nickname = user.nickname()
			email = user.email()
			status = Account.my_get_or_insert(user_id, 
				nickname = nickname, 
				email = email)
			# Login successful
			self.redirect('/')			

		else:
			self.response.write('Access Denied')

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
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/login'))
			
		else:
			logout = users.create_logout_url('/')
			self.render('timer.html',
				user_name = user.nickname(), 
				logout_url = logout)	

	def post(self):
		
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/login'))
			
		else:
			user = users.get_current_user()
			user_ent_key = ndb.Key(Account, user.user_id())	
			active = bool(self.request.get('active'))
			hour = int(self.request.get('hour'))
			mins = int(self.request.get('mins'))
			date = str(self.request.get('date')) # client date as string "2017-01-10". Server time Could be different
			logging.error(date)
			t = datetime.date.today() # datetime.date(2017, 1, 10)
			ndb_date = t.replace(year = int(date[0:4]),
								 month = int(date[5:7]),
								 day = int(date[8:10]))
			# logging.error("hour: "+hour+" mins: "+mins)
			if (active):
				work = Work(active=active, starth=hour, startm=mins, date=ndb_date, id=user.user_id())
				work.put()

			wKey = ndb.Key('Work', user.user_id())
			work = wKey.get()
			self.response.out.write('totalh = '+str(work.starth))


app = webapp2.WSGIApplication([
    ('/', TimerHandler),
    ('/login', RegisterUserHandler)
], debug=True)
