/**
 * Service Hours Settings Page
 * Configure human agent availability hours
 * Phase 11 Week 4
 */

import { useState } from 'react';
import { Button } from '@platform/ui/components/button';
import { Card } from '@platform/ui/components/card';
import { Label } from '@platform/ui/components/label';
import { Switch } from '@platform/ui/components/switch';
import { logger } from '@platform/shared';

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

interface ServiceHoursConfig {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
  timezone: string;
}

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const WEEKDAY_SCHEDULE: DaySchedule = {
  enabled: true,
  start: '09:00',
  end: '17:00',
};

const WEEKEND_SCHEDULE: DaySchedule = {
  enabled: false,
  start: '10:00',
  end: '14:00',
};

export function ServiceHoursSettings() {
  const [serviceHours, setServiceHours] = useState<ServiceHoursConfig>({
    monday: WEEKDAY_SCHEDULE,
    tuesday: WEEKDAY_SCHEDULE,
    wednesday: WEEKDAY_SCHEDULE,
    thursday: WEEKDAY_SCHEDULE,
    friday: WEEKDAY_SCHEDULE,
    saturday: WEEKEND_SCHEDULE,
    sunday: WEEKEND_SCHEDULE,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const [isSaving] = useState(false);

  // TODO: Load service hours from API
  // const { data, isLoading } = trpc.aiPersonalities.getServiceHours.useQuery();

  // TODO: Implement updateServiceHours endpoint in aiPersonalities router
  // const updateHours = trpc.aiPersonalities.updateServiceHours.useMutation({
  //   onSuccess: () => {
  //     alert('Service hours updated successfully!');
  //     setIsSaving(false);
  //   },
  //   onError: (error: unknown) => {
  //     console.error('Failed to update service hours:', error);
  //     alert('Failed to update service hours. Please try again.');
  //     setIsSaving(false);
  //   },
  // });

  const handleSave = async () => {
    // setIsSaving(true);
    // TODO: Get personality ID from context or props
    // const personalityId = 'default-personality-id';

    // await updateHours.mutateAsync({
    //   personalityId,
    //   serviceHours,
    // });

    logger.info('Service hours save attempted (not yet implemented)', { serviceHours });
    alert('Service hours functionality not yet implemented. See Phase 11 Week 4 TODO.');
  };

  const handleDayToggle = (day: typeof DAYS_OF_WEEK[number]) => {
    setServiceHours({
      ...serviceHours,
      [day]: {
        ...serviceHours[day],
        enabled: !serviceHours[day].enabled,
      },
    });
  };

  const handleTimeChange = (
    day: typeof DAYS_OF_WEEK[number],
    field: 'start' | 'end',
    value: string
  ) => {
    setServiceHours({
      ...serviceHours,
      [day]: {
        ...serviceHours[day],
        [field]: value,
      },
    });
  };

  const applyToAllWeekdays = () => {
    const mondaySchedule = serviceHours.monday;
    setServiceHours({
      ...serviceHours,
      tuesday: { ...mondaySchedule },
      wednesday: { ...mondaySchedule },
      thursday: { ...mondaySchedule },
      friday: { ...mondaySchedule },
    });
  };

  const apply24_7 = () => {
    const schedule: DaySchedule = { enabled: true, start: '00:00', end: '23:59' };
    setServiceHours({
      ...serviceHours,
      monday: schedule,
      tuesday: schedule,
      wednesday: schedule,
      thursday: schedule,
      friday: schedule,
      saturday: schedule,
      sunday: schedule,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Support Service Hours</h2>
        <p className="text-gray-600 mt-2">
          Configure when human agents are available to handle escalations. Outside these hours,
          escalations will be scheduled for follow-up.
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          {/* Timezone */}
          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              value={serviceHours.timezone}
              onChange={(e) => setServiceHours({ ...serviceHours, timezone: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 p-2"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="UTC">UTC</option>
              <option value="Europe/London">London (GMT/BST)</option>
              <option value="Europe/Paris">Paris (CET/CEST)</option>
            </select>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={applyToAllWeekdays}
            >
              Apply Monday to All Weekdays
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={apply24_7}
            >
              Set 24/7 Availability
            </Button>
          </div>

          {/* Day Configuration */}
          <div className="space-y-3">
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day}
                className="flex items-center gap-4 p-3 border rounded-lg"
              >
                <div className="flex items-center gap-2 w-32">
                  <Switch
                    id={`${day}-enabled`}
                    checked={serviceHours[day].enabled}
                    onCheckedChange={() => handleDayToggle(day)}
                  />
                  <Label
                    htmlFor={`${day}-enabled`}
                    className="capitalize font-medium cursor-pointer"
                  >
                    {day}
                  </Label>
                </div>

                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={serviceHours[day].start}
                    onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                    disabled={!serviceHours[day].enabled}
                    className="px-3 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    value={serviceHours[day].end}
                    onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                    disabled={!serviceHours[day].enabled}
                    className="px-3 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {!serviceHours[day].enabled && (
                  <span className="text-sm text-gray-500 italic">Unavailable</span>
                )}
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? 'Saving...' : 'Save Service Hours'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ How Service Hours Work</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Escalations within service hours trigger immediate agent notifications</li>
          <li>• Outside service hours, escalations are scheduled for next available time</li>
          <li>• Users are informed about expected response time based on availability</li>
          <li>• All times are in the selected timezone</li>
        </ul>
      </Card>
    </div>
  );
}
