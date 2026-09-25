# Chapter 5's moving example: eight requests to a web service, grouped by
# endpoint, joined to the table of who owns each endpoint, and counted per hour.

from stepper import Stepper

s = Stepper(caption='Log Example')
s.line('import pandas as pd')
s.step("logs = pd.read_csv('data/logs.csv')", label='read_csv', show=['logs'],
       note='Eight requests: when, which endpoint, and how many milliseconds each took.')
s.step("logs['time'] = pd.to_datetime(logs['time'])", label='to_datetime', show=["logs['time']"],
       note='The time column was text (str); now it is datetime64[us], real points in time.')
s.step("logs['hour'] = logs['time'].dt.hour", label='.dt', show=['logs'], pick={'logs': "logs['hour']"},
       note='.dt reaches into each datetime: here, the hour of the day.')
s.step("logs.sort_values('ms', ascending=False).head(3)", label='sort_values', show=['_'],
       note='The three slowest requests; each row keeps its index label.')
s.step("logs.groupby('endpoint')['ms'].mean()", label='groupby', show=['logs', '_'],
       mask={'logs': "logs['endpoint'] == '/login'"},
       note='Split by endpoint, a mean per group, one row back per group. The four /login rows average 315.')
s.step("per_endpoint = logs.groupby('endpoint').agg(requests=('ms', 'size'), mean_ms=('ms', 'mean'))",
       label='agg', show=['per_endpoint'],
       note='Each keyword names a result column and gives its source column and reduction. The keys come back sorted.')
s.line("owners = pd.read_csv('data/owners.csv')")
s.step("per_endpoint.merge(owners, on='endpoint')", label='merge', show=['owners', '_'],
       note="how='inner' is the default: only keys in both tables. /upload has no owner and /billing no requests, so both fall off.")
s.step("report = per_endpoint.merge(owners, on='endpoint', how='left')", label='merge', show=['report'],
       note="how='left' keeps every row of the left table; /upload's team is NaN.")
s.step("hourly = logs.resample('h', on='time').agg(requests=('ms', 'size'))", label='resample', show=['hourly'],
       note='One row per hour, labelled by its start, and 11:00 is there with 0 requests.')
s.step("hourly['requests'].rolling(2).mean()", label='rolling', show=['_'],
       note='The mean of each hour and the one before it; the first hour has no full window, so NaN.')
s.step("logs.pivot_table(index='endpoint', columns='hour', values='ms', aggfunc='count', fill_value=0)",
       label='pivot_table', show=['_'],
       note='Requests per endpoint per hour: endpoints down the side, hours across. Only hours with a request get a column.')
