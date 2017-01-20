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
import json

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
	date = ndb.DateProperty(indexed = True)	
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
	# get request for html of the page
	def get(self):	
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/login'))
			
		else:
			logout = users.create_logout_url('/')
			self.render('timer.html',
				user_name = user.nickname(), 
				logout_url = logout)	

	# All write to the datastore
	def post(self):
		
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/login'))
			
		else:
			user = users.get_current_user()
			user_ent_key = ndb.Key(Account, user.user_id())	

			# The server logic is very simple. 
			# All the heavy lifting like "splitting work crossing 12AM" is left to the client
			active = bool(int(self.request.get('active'))) # if active = 0, bool() gives True
			date = str(self.request.get('date')) # client date as string "2017-01-10". Server time Could be different
			totalh = int(self.request.get('totalh'))
			totalm = int(self.request.get('totalm'))
			starth = int(self.request.get('starth'))
			startm = int(self.request.get('startm'))
			# logging.error('***Active**** = '+ str(self.request.get('active')))
			t = datetime.date.today() # datetime.date(2017, 1, 10)
			ndb_date = t.replace(year = int(date[0:4]),
								 month = int(date[5:7]),
								 day = int(date[8:10]))
			# To read work using key
			# wKey = ndb.Key('Work', user.user_id())
			# work = wKey.get()
			# manually set the key for work. Only one instance of work is there.
			work = Work(active=active, starth=starth, startm=startm, date=ndb_date, totalh=totalh, totalm=totalm, id=user.user_id())
			work.put()

			# we need to write Entry only when paused/stopped, not when started to play
			# When paused active will be made false
			if (not active):
				# Check if an entry corresponding to the date already exists!
				qry = Entry.query(Entry.date == ndb_date)
				qry_result = qry.fetch()
				# qry_result is [] if new date
				if (not qry_result):
					# make user as the parent entity so that entry of many users can be distinguished
					entry = Entry(date=ndb_date, hours=totalh, mins=totalm, parent=user_ent_key)	
				else:
					entry = qry_result[0]
					entry.hours = totalh
					entry.mins = totalm

				entry.put()
			
			# No response is required!!!
			# response_data = {"totalh":totalh, "totalm":totalm, "starth":starth, "startm":startm }
			# self.response.out.write(json.dumps(response_data))	

class AjaxHandler(Handler):
	# page load get request
	def get(self):	
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/login'))
			
		else:
			logout = users.create_logout_url('/')
			user_ent_key = ndb.Key(Account, user.user_id())	
			# To read work using key
			wKey = ndb.Key('Work', user.user_id()) # id is given
			work = wKey.get()

			if (work is None):
				# First time creation
				response_data = {"active":False}
			else:
				# date is not JSON serializable. Just convert it to a string
				# There is a problem if we get 2017-1-13. We instead need 2017-01-13
				date = work.date
				date_str = str(date.year) + '-' + ('0'+str(date.month) if date.month < 10 else str(date.month)) + '-' + ('0'+str(date.day) if date.day < 10 else str(date.day))

				response_data = {"active":work.active, "date":date_str, "totalh":work.totalh, "totalm":work.totalm, "starth":work.starth, "startm":work.startm}
			
			self.response.out.write(json.dumps(response_data))


app = webapp2.WSGIApplication([
    ('/', TimerHandler),
    ('/ajax', AjaxHandler),
    ('/login', RegisterUserHandler)
], debug=True)
