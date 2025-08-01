---
description: Define schedules in Dagster using ScheduleDefinition or the @schedule decorator.
sidebar_position: 100
title: Defining schedules
---

import ScaffoldSchedule from '@site/docs/partials/\_ScaffoldSchedule.md';

<ScaffoldSchedule />

## Defining basic schedules

The following examples demonstrate how to define some basic schedules.

<Tabs>
  <TabItem value="Using ScheduleDefinition">

This example demonstrates how to define a schedule using <PyObject section="schedules-sensors" module="dagster" object="ScheduleDefinition" /> that will run all assets every day at midnight.

<CodeExample
  path="docs_snippets/docs_snippets/concepts/partitions_schedules_sensors/schedules/schedules.py"
  startAfter="start_basic_schedule"
  endBefore="end_basic_schedule"
  title="src/<project_name>/defs/assets.py"
/>

:::note

The `cron_schedule` argument accepts standard [cron expressions](https://en.wikipedia.org/wiki/Cron). If your `croniter` dependency's version is `>= 1.0.12`, the argument will also accept the following:

<ul>
  <li>`@daily`</li>
  <li>`@hourly`</li>
  <li>`@monthly`</li>
</ul>

:::

</TabItem>
<TabItem value="Using @schedule">

This example demonstrates how to define a schedule using <PyObject section="schedules-sensors" module="dagster" object="schedule" decorator />, which provides more flexibility than <PyObject section="schedules-sensors" module="dagster" object="ScheduleDefinition" />. For example, you can [configure job behavior based on its scheduled run time](/guides/automate/schedules/configuring-job-behavior) or [emit log messages](#emitting-log-messages-from-schedule-evaluation).

```python
@schedule(target="*", cron_schedule="0 0 * * *")
def basic_schedule(): ...
  # things the schedule does, like returning a RunRequest or SkipReason
```

:::note

The `cron_schedule` argument accepts standard [cron expressions](https://en.wikipedia.org/wiki/Cron). If your `croniter` dependency's version is `>= 1.0.12`, the argument will also accept the following:

<ul>
  <li>`@daily`</li>
  <li>`@hourly`</li>
  <li>`@monthly`</li>
</ul>

:::

</TabItem>
</Tabs>

## Emitting log messages from schedule evaluation

This example demonstrates how to emit log messages from a schedule during its evaluation function. These logs will be visible in the UI when you inspect a tick in the schedule's tick history.

<CodeExample
  path="docs_snippets/docs_snippets/concepts/partitions_schedules_sensors/schedules/schedules.py"
  startAfter="start_schedule_logging"
  endBefore="end_schedule_logging"
  title="src/<project_name>/defs/schedules.py"
/>

:::note

Schedule logs are stored in your [Dagster instance's compute log storage](/deployment/oss/oss-instance-configuration#compute-log-storage). You should ensure that your compute log storage is configured to view your schedule logs.

:::
